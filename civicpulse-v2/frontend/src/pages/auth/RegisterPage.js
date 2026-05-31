import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const FEATURES = [
  { icon: '📍', text: 'Report civic issues instantly' },
  { icon: '🔔', text: 'Get real-time status updates' },
  { icon: '📊', text: 'Track resolution progress live' },
  { icon: '🤝', text: 'Join 12,000+ active citizens' },
];

function getPwStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6)  s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const PW_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong 🔒'];

// ── 6-box OTP input ───────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');

  const handleKey = (idx, e) => {
    if (e.key === 'Backspace') {
      const next = [...digits];
      if (next[idx] !== ' ') {
        next[idx] = ' ';
      } else if (idx > 0) {
        next[idx - 1] = ' ';
        inputs.current[idx - 1]?.focus();
      }
      onChange(next.join('').trimEnd());
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = [...digits];
    next[idx] = e.key;
    onChange(next.join('').replace(/ /g, ''));
    if (idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0' }}>
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={digits[i] === ' ' ? '' : digits[i]}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onChange={() => {}}
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800,
            border: `2px solid ${digits[i] !== ' ' && digits[i] ? '#6366f1' : 'var(--glass-border)'}`,
            borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
            outline: 'none', fontFamily: 'var(--f-display)', transition: 'border-color .2s',
          }}
        />
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [step,          setStep]          = useState('form'); // 'form' | 'otp'
  const [form,          setForm]          = useState({ name: '', email: '', password: '', phone: '', pincode: '' });
  const [errors,        setErrors]        = useState({});
  const [apiErr,        setApiErr]        = useState('');
  const [busy,          setBusy]          = useState(false);
  const [googleProfile, setGoogleProfile] = useState(null);
  const googleBtnRef = useRef(null);

  const [otp,        setOtp]        = useState('');
  const [otpErr,     setOtpErr]     = useState('');
  const [otpBusy,    setOtpBusy]    = useState(false);
  const [phoneToken, setPhoneToken] = useState('');
  const [countdown,  setCountdown]  = useState(0);

  const { register, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const strength = getPwStrength(form.password);

  // ── Google SDK ────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const scriptId = 'google-gsi';
    if (!document.getElementById(scriptId)) {
      const s  = document.createElement('script');
      s.id     = scriptId;
      s.src    = 'https://accounts.google.com/gsi/client';
      s.async  = true;
      s.defer  = true;
      s.onload = initGoogle;
      document.head.appendChild(s);
    } else if (window.google) {
      initGoogle();
    }
    function initGoogle() {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback:  handleGoogleResponse,
      });
      if (googleBtnRef.current) {
        window.google?.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black', size: 'large', width: '100%',
          text: 'continue_with', shape: 'rectangular',
        });
      }
    }
  }, []); // eslint-disable-line

  // ── Countdown timer ───────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Google callback ───────────────────────────────────────
  const handleGoogleResponse = async (response) => {
    setApiErr('');
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/auth/google`, { idToken: response.credential });
      if (!data.isNewUser) {
        loginWithToken(data.token, data.user);
        navigate('/');
        return;
      }
      const gp = data.googleProfile;
      setGoogleProfile(gp);
      setForm(prev => ({ ...prev, name: gp.name || prev.name, email: gp.email || prev.email }));
    } catch (err) {
      setApiErr(err.response?.data?.message || 'Google sign-in failed');
    }
    setBusy(false);
  };

  const f = k => e => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name     = 'Name is required';
    if (!form.email.trim())       e.email    = 'Email is required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.phone)              e.phone    = 'Mobile number is required';
    else if (!/^\+91[6-9]\d{9}$/.test(form.phone))
      e.phone = 'Must be +91 followed by 10 digits (e.g. +919876543210)';
    if (form.pincode && !/^[1-9][0-9]{5}$/.test(form.pincode))
      e.pincode = 'Must be a valid 6-digit Indian pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step 1: send OTP to email ─────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setApiErr('');
    if (!validate()) return;
    setBusy(true);
    try {
      await axios.post(`${API}/auth/send-otp`, { email: form.email, phone: form.phone });
      setOtp('');
      setOtpErr('');
      setCountdown(60);
      setStep('otp');
    } catch (err) {
      setApiErr(err.response?.data?.message || 'Failed to send OTP');
    }
    setBusy(false);
  };

  // ── Resend OTP ────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    setOtpErr('');
    setOtpBusy(true);
    try {
      await axios.post(`${API}/auth/send-otp`, { email: form.email, phone: form.phone });
      setOtp('');
      setCountdown(60);
    } catch (err) {
      setOtpErr(err.response?.data?.message || 'Failed to resend OTP');
    }
    setOtpBusy(false);
  };

  // ── Step 2: verify OTP → register ────────────────────────
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setOtpErr('');
    if (otp.length < 6) { setOtpErr('Please enter the full 6-digit OTP'); return; }
    setOtpBusy(true);
    try {
      // 1. Verify OTP
      const { data: vtData } = await axios.post(`${API}/auth/verify-otp`, {
        email: form.email,
        phone: form.phone,
        otp,
      });
      const pt = vtData.phoneToken;
      setPhoneToken(pt);

      // 2. Register
      await register({ ...form, phoneToken: pt, googleId: googleProfile?.googleId });
      navigate('/');
    } catch (err) {
      setOtpErr(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Verification failed'
      );
    }
    setOtpBusy(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-blob auth-blob-1" style={{ background: '#8b5cf6' }} />
      <div className="auth-blob auth-blob-2" style={{ background: '#6366f1' }} />
      <div className="auth-blob auth-blob-3" />

      <div className="register-container">

        {/* Left panel */}
        <div className="register-left">
          <div className="login-brand"><div className="brand-dot" /><span>CivicPulse</span></div>
          <div>
            <h2 className="register-left-title">Your city.<br /><span>Your voice.</span></h2>
            <p className="register-left-sub">Create your free account and start making a difference in Kolkata today.</p>
            <div className="register-features">
              {FEATURES.map((ft, i) => (
                <div key={i} className="register-feature" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                  <div className="register-feature-icon">{ft.icon}</div>
                  <span>{ft.text}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8 }}>
              🇮🇳 This platform is for Indian citizens only. Phone numbers must use +91 country code.
            </div>
          </div>
          <div className="login-left-badge">🏙️ Serving Kolkata, West Bengal</div>
        </div>

        {/* Right panel */}
        <div className="register-right">

          {step === 'form' ? (
            <>
              <h1 className="register-title">Create your account</h1>
              <p className="register-sub">Join thousands of active citizens · 🇮🇳 India only</p>

              {apiErr && <div className="alert alert-error">⚠️ {apiErr}</div>}

              {/* Google Sign-In */}
              {GOOGLE_CLIENT_ID && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div ref={googleBtnRef} style={{ width: '100%', minHeight: 44 }} />
                  {googleProfile && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
                      {googleProfile.picture && <img src={googleProfile.picture} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />}
                      <div style={{ fontSize: 12 }}>
                        <div style={{ color: '#22c55e', fontWeight: 700 }}>✅ Signed in with Google</div>
                        <div style={{ color: 'var(--text-muted)' }}>{googleProfile.email}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or register with email</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
                  </div>
                </div>
              )}

              <form onSubmit={handleSendOtp} noValidate>

                {/* Name */}
                <div className="form-group">
                  <label className="form-label">Full name <span style={{ color: '#ef4444' }}>*</span></label>
                  <div className="input-wrap">
                    <span className="input-icon">👤</span>
                    <input className={`form-control ${errors.name ? 'input-error' : ''}`} placeholder="Riya Sharma" value={form.name} onChange={f('name')} />
                  </div>
                  {errors.name && <div className="field-error">⚠ {errors.name}</div>}
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label">
                    Email address <span style={{ color: '#ef4444' }}>*</span>
                    {googleProfile && (
                      <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>✅ from Google</span>
                    )}
                  </label>
                  <div className="input-wrap">
                    <span className="input-icon">✉️</span>
                    <input
                      className={`form-control ${errors.email ? 'input-error' : ''}`}
                      type="email" placeholder="you@example.com"
                      value={form.email} onChange={f('email')}
                      readOnly={!!googleProfile}
                      style={googleProfile ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                    />
                  </div>
                  {errors.email && <div className="field-error">⚠ {errors.email}</div>}
                  {!googleProfile && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      📧 OTP will be sent to this email to verify both email &amp; phone.
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label">
                    📱 Mobile number
                    <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(255,165,0,0.15)', color: '#fbbf24', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                      🇮🇳 +91 only
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)', padding: '0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      🇮🇳 +91
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        className={`form-control ${errors.phone ? 'input-error' : ''}`}
                        placeholder="9876543210"
                        value={form.phone.replace('+91', '')}
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setForm(p => ({ ...p, phone: raw ? `+91${raw}` : '' }));
                          if (errors.phone) setErrors(p => ({ ...p, phone: null }));
                        }}
                        maxLength={10}
                      />
                    </div>
                  </div>
                  {errors.phone
                    ? <div className="field-error">⚠ {errors.phone}</div>
                    : <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Phone number is stored for your account profile.</div>
                  }
                </div>

                <div className="grid-2">
                  {/* Pincode */}
                  <div className="form-group">
                    <label className="form-label">PIN code <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(255,165,0,0.15)', color: '#fbbf24', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>🇮🇳</span></label>
                    <div className="input-wrap">
                      <span className="input-icon">📮</span>
                      <input
                        className={`form-control ${errors.pincode ? 'input-error' : ''}`}
                        placeholder="700001" value={form.pincode}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setForm(p => ({ ...p, pincode: v }));
                          if (errors.pincode) setErrors(p => ({ ...p, pincode: null }));
                        }}
                        maxLength={6}
                      />
                    </div>
                    {errors.pincode && <div className="field-error">⚠ {errors.pincode}</div>}
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <label className="form-label">Password <span style={{ color: '#ef4444' }}>*</span></label>
                    <div className="input-wrap">
                      <span className="input-icon">🔒</span>
                      <input className={`form-control ${errors.password ? 'input-error' : ''}`} type="password" placeholder="min 6 chars" value={form.password} onChange={f('password')} />
                    </div>
                    {form.password && (
                      <>
                        <div className="pw-strength">
                          {[1,2,3,4].map(i => <div key={i} className={`pw-bar ${strength >= i ? `active-${strength}` : ''}`} />)}
                        </div>
                        <div className="pw-label">{PW_LABELS[strength]}</div>
                      </>
                    )}
                    {errors.password && <div className="field-error">⚠ {errors.password}</div>}
                  </div>
                </div>

                <button className="btn btn-primary btn-full login-submit" disabled={busy}
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
                  {busy
                    ? <><span className="spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.2)' }} /> Sending OTP…</>
                    : '📧 Send OTP to Email'}
                </button>
              </form>

              <p className="login-register-link">Already have an account? <Link to="/login">Sign in</Link></p>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: '.5rem' }}>
                🇮🇳 For Indian citizens only · By registering you agree to our Terms of Service
              </p>
            </>
          ) : (
            /* ── Step 2: OTP ── */
            <>
              <button onClick={() => { setStep('form'); setOtpErr(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                ← Back
              </button>

              <h1 className="register-title">Check your email</h1>

              {/* What was verified */}
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--r-sm)', padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>OTP sent to verify:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    📧 {form.email}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    📱 {form.phone} <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: 4, padding: '1px 6px' }}>linked to account</span>
                  </div>
                </div>
              </div>

              {otpErr && <div className="alert alert-error">⚠️ {otpErr}</div>}

              <form onSubmit={handleVerifyAndRegister} noValidate>
                <OtpInput value={otp} onChange={setOtp} disabled={otpBusy} />

                <button className="btn btn-primary btn-full login-submit"
                  disabled={otpBusy || otp.length < 6}
                  style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 20px rgba(34,197,94,0.4)', marginTop: 8 }}>
                  {otpBusy
                    ? <><span className="spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.2)' }} /> Creating account…</>
                    : '✅ Verify & Create Account'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                {countdown > 0
                  ? <span>Resend in <strong style={{ color: 'var(--text-secondary)' }}>{countdown}s</strong></span>
                  : <button onClick={handleResend} disabled={otpBusy}
                      style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                      🔁 Resend OTP
                    </button>
                }
              </div>

              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: '1rem' }}>
                OTP valid for 10 minutes · Do not share with anyone
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}