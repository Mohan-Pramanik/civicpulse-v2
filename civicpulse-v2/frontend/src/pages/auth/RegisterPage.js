import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const [form, setForm]   = useState({ name:'', email:'', password:'', phone:'' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    }
    setBusy(false);
  };

  const f = (k) => e => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo"><div className="brand-dot" /><span>CivicPulse</span></div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Join citizens making Kolkata better</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-control" placeholder="Riya Sharma" value={form.name} onChange={f('name')} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={f('email')} required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input className="form-control" placeholder="98000 00000" value={form.phone} onChange={f('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="min 6 chars" value={form.password} onChange={f('password')} required />
            </div>
          </div>
          <button className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create account →'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:'1.25rem', fontSize:13, color:'var(--text-muted)' }}>
          Already registered? <Link to="/login" style={{ color:'var(--green)', fontWeight:500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
