import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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

const validateIndianPhone = phone => {
  if (!phone) return null;
  if (!/^\+91\d{10}$/.test(phone))
    return 'Must be a valid number: +91 followed by 10 digits';
  return null;
};

const validateIndianPincode = pin => {
  if (!pin) return null;
  if (!/^[1-9][0-9]{5}$/.test(pin))
    return 'Must be a valid 6-digit Indian pincode (e.g. 700001)';
  return null;
};

export default function RegisterPage() {
  const [form,   setForm]   = useState({ name: '', email: '', password: '', phone: '', pincode: '' });
  const [errors, setErrors] = useState({});
  const [apiErr, setApiErr] = useState('');
  const [busy,   setBusy]   = useState(false);

  const { register } = useAuth();
  const navigate     = useNavigate();
  const strength     = getPwStrength(form.password);

  const f = k => e => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name     = 'Name is required';
    if (!form.email.trim())       e.email    = 'Email is required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    const phoneErr   = validateIndianPhone(form.phone);
    const pincodeErr = validateIndianPincode(form.pincode);
    if (phoneErr)   e.phone   = phoneErr;
    if (pincodeErr) e.pincode = pincodeErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async e => {
    e.preventDefault();
    setApiErr('');
    if (!validate()) return;
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setApiErr(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Registration failed'
      );
    }
    setBusy(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-blob auth-blob-1" style={{ background: '#8b5cf6' }} />
      <div className="auth-blob auth-blob-2" style={{ background: '#6366f1' }} />
      <div className="auth-blob auth-blob-3" />

      <div className="register-container">

        {/* Left panel */}
        <div className="register-left">
          <div className="login-brand">
            <div className="brand-dot" />
            <span>CivicPulse</span>
          </div>
          <div>
            <h2 className="register-left-title">
              Your city.<br /><span>Your voice.</span>
            </h2>
            <p className="register-left-sub">
              Create your free account and start making a difference in Kolkata today.
            </p>
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
          <h1 className="register-title">Create your account</h1>
          <p className="register-sub">Join thousands of active citizens · 🇮🇳 India only</p>

          {apiErr && <div className="alert alert-error">⚠️ {apiErr}</div>}

          <form onSubmit={submit} noValidate>

            <div className="form-group">
              <label className="form-label">Full name <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="input-wrap">
                <span className="input-icon">👤</span>
                <input
                  className={`form-control ${errors.name ? 'input-error' : ''}`}
                  placeholder="Riya Sharma"
                  value={form.name}
                  onChange={f('name')}
                />
              </div>
              {errors.name && <div className="field-error">⚠ {errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Email address <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="input-wrap">
                <span className="input-icon">✉️</span>
                <input
                  className={`form-control ${errors.email ? 'input-error' : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={f('email')}
                />
              </div>
              {errors.email && <div className="field-error">⚠ {errors.email}</div>}
            </div>

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
                : <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>10-digit Indian mobile (without +91)</div>
              }
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  PIN code
                  <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(255,165,0,0.15)', color: '#fbbf24', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>🇮🇳</span>
                </label>
                <div className="input-wrap">
                  <span className="input-icon">📮</span>
                  <input
                    className={`form-control ${errors.pincode ? 'input-error' : ''}`}
                    placeholder="700001"
                    value={form.pincode}
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

              <div className="form-group">
                <label className="form-label">Password <span style={{ color: '#ef4444' }}>*</span></label>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    className={`form-control ${errors.password ? 'input-error' : ''}`}
                    type="password"
                    placeholder="min 6 chars"
                    value={form.password}
                    onChange={f('password')}
                  />
                </div>
                {form.password && (
                  <>
                    <div className="pw-strength">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`pw-bar ${strength >= i ? `active-${strength}` : ''}`} />
                      ))}
                    </div>
                    <div className="pw-label">{PW_LABELS[strength]}</div>
                  </>
                )}
                {errors.password && <div className="field-error">⚠ {errors.password}</div>}
              </div>
            </div>

            <button
              className="btn btn-primary btn-full login-submit"
              disabled={busy}
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}
            >
              {busy
                ? <><span className="spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.2)' }} /> Creating account…</>
                : '🚀 Create free account'}
            </button>
          </form>

          <p className="login-register-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: '.5rem' }}>
            🇮🇳 For Indian citizens only · By registering you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}