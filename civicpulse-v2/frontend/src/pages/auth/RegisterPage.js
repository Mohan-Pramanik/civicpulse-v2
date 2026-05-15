import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const FEATURES = [
  { icon: '📍', text: 'Report civic issues instantly' },
  { icon: '🔔', text: 'Real-time status updates' },
  { icon: '📊', text: 'Track resolution progress live' },
  { icon: '🤝', text: 'Join 12,000+ active citizens' },
];

function getStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong 🔒'];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const strength = getStrength(form.password);
  const f = k => e => setForm({ ...form, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await register(form); navigate('/'); }
    catch (err) { setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed'); }
    setBusy(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-blob auth-blob-1" style={{ background: '#8b5cf6' }} />
      <div className="auth-blob auth-blob-2" style={{ background: '#6366f1' }} />
      <div className="auth-blob auth-blob-3" />

      <div className="register-container">
        <div className="register-left">
          <div className="login-brand"><div className="brand-dot" /><span>CivicPulse</span></div>
          <div>
            <h2 className="register-left-title">Your city.<br /><span>Your voice.</span></h2>
            <p className="register-left-sub">Create your free account and start making a difference in Kolkata today.</p>
            <div className="register-features">
              {FEATURES.map((f, i) => (
                <div key={i} className="register-feature" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                  <div className="register-feature-icon">{f.icon}</div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="login-left-badge">🏙️ Serving Kolkata, West Bengal</div>
        </div>

        <div className="register-right">
          <h1 className="register-title">Create your account</h1>
          <p className="register-sub">Join thousands of active citizens</p>
          {error && <div className="alert alert-error">⚠️ {error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <div className="input-wrap"><span className="input-icon">👤</span>
                <input className="form-control" placeholder="Riya Sharma" value={form.name} onChange={f('name')} required autoFocus />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="input-wrap"><span className="input-icon">✉️</span>
                <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={f('email')} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <div className="input-wrap"><span className="input-icon">📱</span>
                  <input className="form-control" placeholder="98000 00000" value={form.phone} onChange={f('phone')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrap"><span className="input-icon">🔒</span>
                  <input className="form-control" type="password" placeholder="min 6 chars" value={form.password} onChange={f('password')} required />
                </div>
                {form.password && (<>
                  <div className="pw-strength">{[1,2,3,4].map(i => <div key={i} className={`pw-bar ${strength >= i ? `active-${strength}` : ''}`} />)}</div>
                  <div className="pw-label">{STRENGTH_LABELS[strength]}</div>
                </>)}
              </div>
            </div>
            <button className="btn btn-primary btn-full login-submit" disabled={busy}
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
              {busy ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Creating…</> : '🚀 Create free account'}
            </button>
          </form>
          <p className="login-register-link">Already have an account? <Link to="/login">Sign in</Link></p>
          <p style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', marginTop:'.5rem' }}>By registering you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
}
