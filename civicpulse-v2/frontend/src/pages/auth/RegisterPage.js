import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function getStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#06b6d4', '#22c55e'];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    phone: '', address: '', area: '', ward: '',
  });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);
  const { register } = useAuth();
  const navigate     = useNavigate();
  const strength     = getStrength(form.password);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.phone.trim()) { setError('Phone number is required'); return; }
    setError(''); setBusy(true);
    try { await register(form); navigate('/'); }
    catch (err) { setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed'); }
    setBusy(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-blob auth-blob-1" style={{ background:'#8b5cf6' }} />
      <div className="auth-blob auth-blob-2" style={{ background:'#6366f1' }} />
      <div className="auth-blob auth-blob-3" />

      <div className="register-container">
        {/* Left panel */}
        <div className="register-left">
          <div className="login-brand"><div className="brand-dot" /><span>CivicPulse</span></div>
          <div>
            <h2 className="register-left-title">Your City,<br /><span>Your Voice</span></h2>
            <p className="register-left-sub">Join Kolkata's civic issue reporting platform and help make the city better.</p>
            <div className="register-features">
              {[['📍','Report issues instantly'],['🔔','Real-time updates'],['📊','Track your reports'],['🤝','Join 12k+ citizens']].map(([icon,text],i) => (
                <div key={i} className="register-feature" style={{ animationDelay:`${0.2+i*0.1}s` }}>
                  <div className="register-feature-icon">{icon}</div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="login-left-badge">🏙️ Kolkata, West Bengal</div>
        </div>

        {/* Right panel */}
        <div className="register-right">
          <h1 className="register-title">Create Account</h1>
          <p className="register-sub">Join thousands of active citizens</p>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={submit}>
            {/* Name + Email */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name <span style={{ color:'#ef4444' }}>*</span></label>
                <div className="input-wrap"><span className="input-icon">👤</span>
                  <input className="form-control" placeholder="Riya Sharma" value={form.name} onChange={f('name')} required autoFocus />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email <span style={{ color:'#ef4444' }}>*</span></label>
                <div className="input-wrap"><span className="input-icon">✉️</span>
                  <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={f('email')} required />
                </div>
              </div>
            </div>

            {/* Phone + Password */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone <span style={{ color:'#ef4444' }}>*</span></label>
                <div className="input-wrap"><span className="input-icon">📱</span>
                  <input className="form-control" placeholder="98000 00000" value={form.phone} onChange={f('phone')} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password <span style={{ color:'#ef4444' }}>*</span></label>
                <div className="input-wrap"><span className="input-icon">🔒</span>
                  <input className="form-control" type="password" placeholder="min 6 chars" value={form.password} onChange={f('password')} required minLength={6} />
                </div>
                {form.password && (
                  <>
                    <div className="pw-strength">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`pw-bar ${strength >= i ? `active-${strength}` : ''}`}
                          style={{ background: strength >= i ? STRENGTH_COLORS[strength] : undefined }} />
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:STRENGTH_COLORS[strength], marginTop:3 }}>{STRENGTH_LABELS[strength]}</div>
                  </>
                )}
              </div>
            </div>

            {/* Address (optional) */}
            <div className="form-group">
              <label className="form-label">Street Address</label>
              <div className="input-wrap"><span className="input-icon">🏠</span>
                <input className="form-control" placeholder="e.g. 12 Park Street, near Metro" value={form.address} onChange={f('address')} />
              </div>
            </div>

            {/* Area + Ward */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Area / Locality</label>
                <div className="input-wrap"><span className="input-icon">📍</span>
                  <input className="form-control" placeholder="e.g. Salt Lake" value={form.area} onChange={f('area')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ward No.</label>
                <div className="input-wrap"><span className="input-icon">🏛️</span>
                  <input className="form-control" placeholder="e.g. Ward 66" value={form.ward} onChange={f('ward')} />
                </div>
              </div>
            </div>

            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:'1rem', padding:'8px 12px', background:'var(--hover-bg)', borderRadius:'var(--r-sm)', border:'1px solid var(--glass-border)' }}>
              ⓘ Your contact details are shared with officers handling your reports so they can reach you if needed.
            </div>

            <button className="btn btn-primary btn-full login-submit" disabled={busy}
              style={{ background:'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow:'0 4px 20px rgba(139,92,246,0.4)' }}>
              {busy
                ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Creating account…</>
                : '🚀 Create Free Account'}
            </button>
          </form>

          <p className="login-register-link">Already have an account? <Link to="/login">Sign in here</Link></p>
        </div>
      </div>
    </div>
  );
}