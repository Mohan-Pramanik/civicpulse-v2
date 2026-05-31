const express      = require('express');
const router       = express.Router();
const axios        = require('axios');
const User         = require('../models/User');
const ApiError     = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { protect }  = require('../middleware/auth');
const { registerRules, loginRules, validate } = require('../middleware/validate');
const { success }  = require('../utils/response');
const { sendOtp, verifyOtp } = require('../services/otpService');

// ─────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// Sends a 6-digit OTP to the user's EMAIL to verify both
// their email address and phone number together.
// Body: { email, phone }
// ─────────────────────────────────────────────────────────────
router.post('/send-otp', asyncHandler(async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const { phone } = req.body;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new ApiError('A valid email address is required.', 400);
  }
  if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) {
    throw new ApiError('A valid Indian phone number (+91XXXXXXXXXX) is required.', 400);
  }

  await sendOtp(email, phone);
  success(res, { message: `OTP sent to ${email}` });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Body: { email, phone, otp }
// Returns a phoneToken the register route accepts.
// ─────────────────────────────────────────────────────────────
router.post('/verify-otp', asyncHandler(async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const { phone, otp } = req.body;

  if (!email || !phone || !otp) {
    throw new ApiError('Email, phone, and OTP are all required.', 400);
  }

  const result = await verifyOtp(email, phone, otp);
  if (!result.valid) {
    throw new ApiError(result.reason, 400);
  }

  const jwt = require('jsonwebtoken');
  const phoneToken = jwt.sign(
    { email, phone, verified: true },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );

  success(res, { phoneToken });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/auth/google
// Body: { idToken }
// ─────────────────────────────────────────────────────────────
router.post('/google', asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) throw new ApiError('Google ID token is required.', 400);

  let payload;
  try {
    const r = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    payload = r.data;
  } catch {
    throw new ApiError('Invalid Google token.', 401);
  }

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new ApiError('Google token audience mismatch.', 401);
  }

  const { email, name, picture, sub: googleId } = payload;

  let user = await User.findOne({ email });
  if (user) {
    user.lastLogin   = new Date();
    user.loginCount += 1;
    if (picture && !user.avatar) user.avatar = picture;
    await user.save({ validateBeforeSave: false });
    return success(res, { token: user.getSignedToken(), user, isNewUser: false });
  }

  return success(res, {
    isNewUser:     true,
    googleProfile: { email, name, picture, googleId },
  });
}));

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { name, email, password, phone, pincode, phoneToken }
// phoneToken is issued by /verify-otp and is required.
// ─────────────────────────────────────────────────────────────
router.post('/register', registerRules, validate, asyncHandler(async (req, res) => {
  const {
    name, password, phone, pincode,
    role, department, isHead,
    phoneToken,
    googleId,
  } = req.body;
  // Normalize email the same way send-otp and verify-otp do
  const email = req.body.email?.toLowerCase().trim();

  // ── Require OTP verification ──────────────────────────────
  if (!phoneToken) {
    throw new ApiError('OTP verification is required before registering.', 400);
  }
  try {
    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(phoneToken, process.env.JWT_SECRET);
    console.log('[register debug] decoded.email:', JSON.stringify(decoded.email));
    console.log('[register debug] req email:    ', JSON.stringify(email));
    console.log('[register debug] decoded.phone:', JSON.stringify(decoded.phone));
    console.log('[register debug] req phone:    ', JSON.stringify(phone));
    console.log('[register debug] verified flag:', decoded.verified);
    if (!decoded.verified || decoded.email !== email || decoded.phone !== phone) {
      throw new ApiError('Verification token does not match email/phone. Please re-verify.', 400);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[register debug] JWT error:', err.message);
    throw new ApiError('Verification token is invalid or expired. Please re-verify.', 400);
  }

  // ── Duplicate email ───────────────────────────────────────
  if (await User.findOne({ email })) {
    throw new ApiError('Email already registered', 400);
  }

  // ── India-only validations ────────────────────────────────
  if (phone && !/^\+91[6-9]\d{9}$/.test(phone)) {
    throw new ApiError('Only Indian phone numbers are allowed (+91XXXXXXXXXX).', 400);
  }
  if (pincode && !/^[1-9][0-9]{5}$/.test(pincode)) {
    throw new ApiError('Invalid pincode. Must be a 6-digit Indian pincode.', 400);
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    pincode,
    googleId:   googleId   || undefined,
    role:       role       || 'citizen',
    department: department || undefined,
    isHead:     isHead     || false,
    isVerified: true,
  });

  success(res, { token: user.getSignedToken(), user }, 201);
}));

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
router.post('/login', loginRules, validate, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError('Invalid credentials', 401);
  }
  user.lastLogin   = new Date();
  user.loginCount += 1;
  await user.save({ validateBeforeSave: false });
  success(res, { token: user.getSignedToken(), user });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => success(res, { user: req.user }));

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/updateprofile
// ─────────────────────────────────────────────────────────────
router.put('/updateprofile', protect, asyncHandler(async (req, res) => {
  const { name, phone, area, ward, pincode } = req.body;
  if (phone && !/^\+91[6-9]\d{9}$/.test(phone)) {
    throw new ApiError('Only Indian phone numbers allowed (+91XXXXXXXXXX)', 400);
  }
  if (pincode && !/^[1-9][0-9]{5}$/.test(pincode)) {
    throw new ApiError('Invalid Indian pincode (must be 6 digits)', 400);
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, area, ward, pincode },
    { new: true, runValidators: true }
  );
  success(res, { user });
}));

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/updatepassword
// ─────────────────────────────────────────────────────────────
router.put('/updatepassword', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) {
    throw new ApiError('Current password is incorrect', 400);
  }
  user.password = req.body.newPassword;
  await user.save();
  success(res, { token: user.getSignedToken() });
}));

// ─────────────────────────────────────────────────────────────
// GET /api/auth/seed-departments  (dev helper)
// ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { dept: 'Public Works Department (PWD)',
    head:    { name: 'PWD Department Head',       email: 'pwd@civicpulse.in',                  password: 'pwd@123' },
    officer: { name: 'PWD Field Officer',         email: 'pwd.officer@civicpulse.in',          password: 'pwd.officer@123' } },
  { dept: 'KMC Water Supply Department',
    head:    { name: 'Water Dept Head',           email: 'water@civicpulse.in',                password: 'water@123' },
    officer: { name: 'Water Supply Officer',      email: 'water.officer@civicpulse.in',        password: 'water.officer@123' } },
  { dept: 'Sanitation & Solid Waste Dept',
    head:    { name: 'Sanitation Dept Head',      email: 'sanitation@civicpulse.in',           password: 'sanitation@123' },
    officer: { name: 'Sanitation Officer',        email: 'sanitation.officer@civicpulse.in',   password: 'sanitation.officer@123' } },
  { dept: 'CESC / KMC Lighting Division',
    head:    { name: 'Electricity Dept Head',     email: 'electricity@civicpulse.in',          password: 'electricity@123' },
    officer: { name: 'Electricity Field Officer', email: 'electricity.officer@civicpulse.in',  password: 'electricity.officer@123' } },
  { dept: 'KMC Enforcement Team',
    head:    { name: 'Enforcement Dept Head',     email: 'enforcement@civicpulse.in',          password: 'enforcement@123' },
    officer: { name: 'Enforcement Officer',       email: 'enforcement.officer@civicpulse.in',  password: 'enforcement.officer@123' } },
  { dept: 'KMC General Grievance Cell',
    head:    { name: 'Grievance Cell Head',       email: 'grievance@civicpulse.in',            password: 'grievance@123' },
    officer: { name: 'Grievance Officer',         email: 'grievance.officer@civicpulse.in',    password: 'grievance.officer@123' } },
];

router.get('/seed-departments', asyncHandler(async (req, res) => {
  const created = [];
  await User.findOneAndDelete({ email: 'admin@civicpulse.in' });
  await User.create({ name: 'Admin User', email: 'admin@civicpulse.in', password: 'password123', role: 'admin' });
  created.push({ role: 'admin', email: 'admin@civicpulse.in', password: 'password123' });
  for (const d of DEPARTMENTS) {
    await User.findOneAndDelete({ email: d.head.email });
    await User.create({ ...d.head, role: 'department', department: d.dept, isHead: true });
    created.push({ role: 'dept_head', dept: d.dept, email: d.head.email, password: d.head.password });
    await User.findOneAndDelete({ email: d.officer.email });
    await User.create({ ...d.officer, role: 'department', department: d.dept, isHead: false });
    created.push({ role: 'officer', dept: d.dept, email: d.officer.email, password: d.officer.password });
  }
  res.json({ success: true, message: `✅ Created ${created.length} accounts`, accounts: created });
}));

module.exports = router;