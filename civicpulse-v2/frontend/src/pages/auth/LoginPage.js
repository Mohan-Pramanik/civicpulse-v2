import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { key: 'citizen',    label: 'Citizen',       icon: '👤', desc: 'Report & track issues',  color: '#22c55e', border: 'rgba(34,197,94,0.4)',    glow: 'rgba(34,197,94,0.15)'   },
  { key: 'admin',      label: 'Administrator', icon: '🏛️', desc: 'Manage the platform',    color: '#6366f1', border: 'rgba(99,102,241,0.4)',   glow: 'rgba(99,102,241,0.15)'  },
  { key: 'department', label: 'Officer',       icon: '🔧', desc: 'Handle assigned issues', color: '#f59e0b', border: 'rgba(245,158,11,0.4)',   glow: 'rgba(245,158,11,0.15)'  },
];

const DEMO = {
  citizen:    { email: '', password: '' },
  admin:      { email: 'admin@civicpulse.in',   password: 'password123' },
  department: { email: 'officer@civicpulse.in', password: 'password123' },
};

export default function LoginPage() {
  const [role,  setRole]  = useState('citizen');
  const [form,  setForm]  = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const selectRole = r => {
    setRole(r); setError('');
    const d = DEMO[r];
    setForm(d.email ? d : { email: '', password: '' });
  };

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const u = await login(form.email, form.password);
      navigate(u.role === 'admin' || u.role === 'department' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    }
    setBusy(false);
  };

  const active = ROLES.find(r => r.key === role);

  return (
    <div className="auth-wrap">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />

      <div className="login-container">
        {/* Left panel */}
        <div className="login-left">
          <div className="login-brand">
            <div className="brand-dot" />
            <span>CivicPulse</span>
          </div>
          <div>
            <h2 className="login-left-title">
              Making Kolkata<br />
              <span>better, together.</span>
            </h2>
            <p className="login-left-sub">
              A citizen-powered platform to report, track, and resolve civic issues across the city in real time.
            </p>
            <div className="login-stats">
              <div className="login-stat">
                <span className="login-stat-num">2.4k+</span>
                <span className="login-stat-label">Issues Reported</span>
              </div>
              <div className="login-stat">
                <span className="login-stat-num">68%</span>
                <span className="login-stat-label">Resolution Rate</span>
              </div>
              <div className="login-stat">
                <span className="login-stat-num">12k+</span>
                <span className="login-stat-label">Active Citizens</span>
              </div>
            </div>
          </div>
          <div className="login-left-badge">📍 Kolkata, West Bengal</div>
        </div>

        {/* Right panel */}
        <div className="login-right">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Select your role to continue</p>

          <div className="role-grid">
            {ROLES.map(r => (
              <button
                key={r.key}
                type="button"
                className={`role-card ${role === r.key ? 'active' : ''}`}
                onClick={() => selectRole(r.key)}
                style={role === r.key ? { borderColor: r.border, background: r.glow, boxShadow: `0 0 20px ${r.glow}, var(--s)` } : {}}
              >
                <span className="role-icon">{r.icon}</span>
                <span className="role-label" style={role === r.key ? { color: r.color } : {}}>{r.label}</span>
                <span className="role-desc">{r.desc}</span>
              </button>
            ))}
          </div>

          <div className="login-divider">
            <span>Sign in as {active.label}</span>
          </div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="input-wrap">
                <span className="input-icon">✉️</span>
                <input className="form-control" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoFocus />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input className="form-control" type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
            </div>
            <button className="btn btn-primary btn-full login-submit" disabled={busy}
              style={{ background: `linear-gradient(135deg, ${active.color}, ${active.color}cc)`, boxShadow: `0 4px 20px ${active.glow}` }}>
              {busy
                ? <><span className="spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.2)' }} /> Signing in…</>
                : `Sign in as ${active.label} →`}
            </button>
          </form>

          {role === 'citizen' && (
            <p className="login-register-link">
              New to CivicPulse? <Link to="/register">Create free account</Link>
            </p>
          )}
          {(role === 'admin' || role === 'department') && (
            <p className="login-hint">🔐 Demo credentials pre-filled for testing.</p>
          )}
        </div>
      </div>
    </div>
  );
}