import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  {
    key: 'citizen',
    label: 'Citizen',
    icon: '👤',
    desc: 'Report & track issues',
    color: '#22c55e',
    border: 'rgba(34,197,94,0.4)',
    glow:   'rgba(34,197,94,0.15)',
    demo: { email: '', password: '' },
    subRoles: null,
  },
  {
    key: 'admin',
    label: 'Administrator',
    icon: '🏛️',
    desc: 'Manage the platform',
    color: '#6366f1',
    border: 'rgba(99,102,241,0.4)',
    glow:   'rgba(99,102,241,0.15)',
    demo: { email: 'admin@civicpulse.in', password: 'password123' },
    subRoles: null,
  },
  {
    key: 'department',
    label: 'Officer',
    icon: '🔧',
    desc: 'Handle civic issues',
    color: '#f59e0b',
    border: 'rgba(245,158,11,0.4)',
    glow:   'rgba(245,158,11,0.15)',
    // demo: { email: 'officer@civicpulse.in', password: 'password123' },
    // Two sub-roles shown after selecting Officer
    subRoles: [
      {
        key:   'head',
        label: 'Department Head',
        icon:  '🏅',
        desc:  'Manage officers, assign & oversee issues for your department',
        color: '#f59e0b',
        demo:  { email: 'pwd@civicpulse.in', password: 'pwd@123' },
      },
      {
        key:   'officer',
        label: 'Field Officer',
        icon:  '🦺',
        desc:  'Resolve assigned issues on the ground',
        color: '#06b6d4',
        demo:  { email: 'pwd.officer@civicpulse.in', password: 'pwd.officer@123' },
      },
    ],
  },
];

export default function LoginPage() {
  const [role,    setRole]    = useState('citizen');
  const [subRole, setSubRole] = useState(null);   // 'head' | 'officer' | null
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const activeRole    = ROLES.find(r => r.key === role);
  const activeSubRole = activeRole?.subRoles?.find(s => s.key === subRole);

  const selectRole = (r) => {
    setRole(r.key);
    setSubRole(null);
    setError('');
    // auto-fill demo creds if available
    setForm(r.demo?.email ? r.demo : { email: '', password: '' });
  };

  const selectSubRole = (s) => {
    setSubRole(s.key);
    setError('');
    setForm(s.demo?.email ? s.demo : { email: '', password: '' });
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      if (u.role === 'admin')       navigate('/admin');
      else if (u.role === 'department') navigate('/officer');
      else                              navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    }
    setBusy(false);
  };

  const accentColor  = activeSubRole?.color || activeRole?.color || '#6366f1';
  const accentGlow   = activeRole?.glow || 'rgba(99,102,241,0.15)';
  const accentBorder = activeRole?.border || 'rgba(99,102,241,0.4)';

  return (
    <div className="auth-wrap">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />

      <div className="login-container">
        {/* ── Left panel ── */}
        <div className="login-left">
          <div className="login-brand"><div className="brand-dot" /><span>CivicPulse</span></div>
          <div>
            <h2 className="login-left-title">Making Kolkata<br /><span>Better Together</span></h2>
            <p className="login-left-sub">A crowdsourced civic issue platform connecting citizens with the right government departments.</p>
            <div className="login-stats">
              {[['2.4k+','Issues Reported'],['68%','Resolution Rate'],['12k+','Active Citizens']].map(([v,l]) => (
                <div key={l} className="login-stat">
                  <span className="login-stat-num">{v}</span>
                  <span className="login-stat-label">{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="login-left-badge">📍 Kolkata, West Bengal</div>
        </div>

        {/* ── Right panel ── */}
        <div className="login-right">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-sub">Select your role to sign in</p>

          {/* Role cards */}
          <div className="role-grid">
            {ROLES.map(r => (
              <button key={r.key} type="button"
                className={`role-card ${role === r.key ? 'active' : ''}`}
                onClick={() => selectRole(r)}
                style={role === r.key ? { borderColor:r.border, background:r.glow, boxShadow:`0 0 20px ${r.glow}, var(--s)` } : {}}>
                <span className="role-icon">{r.icon}</span>
                <span className="role-label" style={role === r.key ? { color:r.color } : {}}>{r.label}</span>
                <span className="role-desc">{r.desc}</span>
              </button>
            ))}
          </div>

          {/* Sub-role selection for Officer */}
          {activeRole?.subRoles && (
            <div style={{ marginBottom:'1.25rem' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
                Officer Type
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {activeRole.subRoles.map(s => (
                  <button key={s.key} type="button"
                    onClick={() => selectSubRole(s)}
                    style={{
                      flex: 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '14px 10px',
                      background: subRole === s.key ? `${s.color}15` : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${subRole === s.key ? s.color : 'var(--glass-border)'}`,
                      borderRadius: 'var(--r)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: subRole === s.key ? `0 0 18px ${s.color}30` : 'none',
                    }}>
                    <span style={{ fontSize: 26 }}>{s.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: subRole === s.key ? s.color : 'var(--text-primary)', fontFamily: 'var(--f-display)' }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="login-divider">
            <span>
              Sign in as {activeSubRole?.label || activeRole?.label}
            </span>
          </div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
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
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow:  `0 4px 20px ${accentGlow}`,
              }}>
              {busy
                ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Signing in…</>
                : `Sign in as ${activeSubRole?.label || activeRole?.label} →`}
            </button>
          </form>

          {role === 'citizen' && (
            <p className="login-register-link">
              No account? <Link to="/register">Create one free</Link>
            </p>
          )}
          {(role === 'admin' || role === 'department') && (
            <p className="login-hint">
              🔐 Demo: {(activeSubRole?.demo || activeRole?.demo)?.email} / {(activeSubRole?.demo || activeRole?.demo)?.password}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}