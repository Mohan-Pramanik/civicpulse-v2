import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [form, setForm]     = useState({ email:'', password:'' });
  const [error, setError]   = useState('');
  const [busy,  setBusy]    = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const u = await login(form.email, form.password);
      navigate(u.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    }
    setBusy(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="brand-dot" />
          <span>CivicPulse</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to report and track civic issues</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-control" type="email" placeholder="you@example.com" autoFocus
              value={form.email} onChange={e => setForm({...form, email:e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({...form, password:e.target.value})} required />
          </div>
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.25rem', fontSize:13, color:'var(--text-muted)' }}>
          No account? <Link to="/register" style={{ color:'var(--green)', fontWeight:500 }}>Register here</Link>
        </p>
        <p style={{ textAlign:'center', marginTop:8, fontSize:12, color:'#bbb' }}>
          Demo — admin@civicpulse.in / password123
        </p>
      </div>
    </div>
  );
}
