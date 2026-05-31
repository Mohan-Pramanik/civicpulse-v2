/**
 * otpService.js
 * OTP stored in MongoDB — survives server/nodemon restarts.
 * Sends via Resend.com (free tier: 3,000/month).
 */

const https    = require('https');
const crypto   = require('crypto');
const mongoose = require('mongoose');

// ── Otp Schema ────────────────────────────────────────────────
const OtpSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true },
  phone:     { type: String, required: true },
  otpHash:   { type: String, required: true },
  expiresAt: { type: Date,   required: true },
  attempts:  { type: Number, default: 0 },
  verified:  { type: Boolean, default: false },
});

// TTL index — MongoDB auto-deletes expired docs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.models.Otp || mongoose.model('Otp', OtpSchema);

const OTP_TTL_MS   = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

// ── Send email via Resend REST API ────────────────────────────
async function sendEmail(to, otp, phone) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`\n📧 [DEV MODE] OTP for ${to} (phone: ${phone}): ${otp}\n`);
    return;
  }

  const fromName  = process.env.FROM_NAME  || 'CivicPulse';
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  const body = JSON.stringify({
    from:    `${fromName} <${fromEmail}>`,
    to:      [to],
    subject: `${otp} — Your CivicPulse verification code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
        <div style="font-size:22px;font-weight:800;margin-bottom:4px;">
          <span style="color:#6366f1;">●</span> CivicPulse
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:0;">Civic Issue Reporting · India</p>
        <hr style="border:none;border-top:1px solid #1e293b;margin:16px 0;" />
        <p style="font-size:15px;margin-bottom:8px;">Your verification code is:</p>
        <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#6366f1;text-align:center;padding:20px 0;background:#1e293b;border-radius:10px;margin:16px 0;font-family:monospace;">
          ${otp}
        </div>
        <p style="font-size:13px;color:#94a3b8;">
          Valid for <strong style="color:#f1f5f9;">10 minutes</strong>.<br/>
          Linked to phone: <strong style="color:#f1f5f9;">${phone}</strong>
        </p>
        <p style="font-size:12px;color:#64748b;margin-top:24px;">Never share this code with anyone.</p>
      </div>`,
    text: `Your CivicPulse OTP is ${otp}. Valid 10 min. Phone: ${phone}. Do not share.`,
  });

  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path:     '/emails',
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${apiKey}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () =>
        res.statusCode >= 200 && res.statusCode < 300
          ? resolve()
          : reject(new Error(`Resend ${res.statusCode}: ${d}`))
      );
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Send OTP ──────────────────────────────────────────────────
async function sendOtp(email, phone) {
  const otp = generateOtp();
  console.log(`\n🔐 OTP [${email} / ${phone}] → ${otp}\n`);

  // Upsert: replace any existing OTP for this email
  await Otp.findOneAndUpdate(
    { email },
    {
      email,
      phone,
      otpHash:   hashOtp(otp),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts:  0,
      verified:  false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Send email — failure is non-fatal (OTP is still in DB, visible in console)
  await sendEmail(email, otp, phone).catch(err =>
    console.error('[otpService] Email send failed:', err.message)
  );

  return { sent: true };
}

// ── Verify OTP ────────────────────────────────────────────────
async function verifyOtp(email, phone, enteredOtp) {
  const record = await Otp.findOne({ email });

  if (!record)
    return { valid: false, reason: 'No OTP found for this email. Please request a new one.' };

  if (new Date() > record.expiresAt) {
    await Otp.deleteOne({ email });
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ email });
    return { valid: false, reason: 'Too many wrong attempts. Please request a new OTP.' };
  }

  // Idempotent: already verified (React StrictMode may call twice)
  if (record.verified) {
    return { valid: true };
  }

  record.attempts += 1;
  await record.save();

  if (record.phone !== phone)
    return { valid: false, reason: 'Phone number does not match. Please go back and re-enter.' };

  if (record.otpHash !== hashOtp(enteredOtp)) {
    const left = MAX_ATTEMPTS - record.attempts;
    return { valid: false, reason: `Incorrect OTP. ${left} attempt(s) left.` };
  }

  // ✅ Mark verified — deleted after successful /register
  record.verified = true;
  await record.save();
  return { valid: true };
}

// ── Cleanup after registration ────────────────────────────────
async function cleanupOtp(email) {
  return Otp.deleteOne({ email });
}

module.exports = { sendOtp, verifyOtp, cleanupOtp };