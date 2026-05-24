import React, { useState, useEffect } from 'react';
import { updateProfile, updatePassword, getMyIssues } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ROLE_COLOR = { admin:'#ef4444', department:'#06b6d4', citizen:'#22c55e' };
const ROLE_BG    = { admin:'rgba(239,68,68,0.12)', department:'rgba(6,182,212,0.12)', citizen:'rgba(34,197,94,0.12)' };
const ROLE_LABEL = (user) => ({
  admin:      'Administrator',
  department: user?.isHead ? 'Department Head' : 'Field Officer',
  citizen:    'Citizen',
})[user?.role] || user?.role;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast }             = useToast();

  const [form,  setForm]  = useState({
    name:    user?.name    || '',
    phone:   user?.phone   || '',
    address: user?.address || '',
    area:    user?.area    || '',
    ward:    user?.ward    || '',
  });
  const [pass,  setPass]  = useState({ currentPassword:'', newPassword:'' });
  const [busy1, setBusy1] = useState(false);
  const [busy2, setBusy2] = useState(false);
  const [stats, setStats] = useState(null);
  const [showPass, setShowPass] = useState(false);

  // Load citizen activity stats
  useEffect(() => {
    if (user?.role !== 'citizen') return;
    getMyIssues().then(r => {
      const issues = r.data.issues || [];
      setStats({
        total:      issues.length,
        resolved:   issues.filter(i => i.status === 'resolved').length,
        pending:    issues.filter(i => i.status === 'pending').length,
        inProgress: issues.filter(i => ['assigned','in_progress'].includes(i.status)).length,
      });
    }).catch(() => {});
  }, [user]);

  const saveProfile = async e => {
    e.preventDefault(); setBusy1(true);
    try {
      await updateProfile(form);
      await refreshUser();
      toast('✅ Profile updated!');
    } catch (err) { toast(err.response?.data?.message || 'Failed to update', 'error'); }
    setBusy1(false);
  };

  const savePassword = async e => {
    e.preventDefault(); setBusy2(true);
    try {
      await updatePassword(pass);
      setPass({ currentPassword:'', newPassword:'' });
      toast('✅ Password changed!');
    } catch (err) { toast(err.response?.data?.message || 'Failed to change password', 'error'); }
    setBusy2(false);
  };

  const color = ROLE_COLOR[user?.role] || '#6366f1';

  return (
    <div className="page page-narrow">

      {/* ── Hero card ── */}
      <div className="card fade-up" style={{ marginBottom:'1.25rem', padding:'1.75rem', background:`linear-gradient(135deg,${ROLE_BG[user?.role]||'rgba(99,102,241,0.08)'},rgba(34,197,94,0.04))`, borderColor:`${color}25` }}>
        <div style={{ display:'flex', gap:18, alignItems:'center', flexWrap:'wrap' }}>
          {/* Avatar */}
          <div style={{ width:76, height:76, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}88)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, fontWeight:900, color:'#fff', flexShrink:0, boxShadow:`0 8px 28px ${color}50`, fontFamily:'var(--f-display)' }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>
              Your Profile
            </div>
            <div style={{ fontFamily:'var(--f-display)', fontSize:22, fontWeight:900, color:'var(--text-primary)', letterSpacing:'-.3px', marginBottom:2 }}>
              {user?.name}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:10 }}>
              {user?.email}
              {user?.phone && <span style={{ marginLeft:12 }}>📱 {user.phone}</span>}
            </div>

            {/* Badges */}
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ background:ROLE_BG[user?.role], border:`1px solid ${color}30`, borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700, color, fontFamily:'var(--f-display)', textTransform:'uppercase', letterSpacing:'.05em' }}>
                {ROLE_LABEL(user)}
              </span>
              {user?.department && (
                <span style={{ background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.25)', borderRadius:20, padding:'3px 12px', fontSize:12, color:'#06b6d4' }}>
                  🏛️ {user.department}
                </span>
              )}
              {user?.area && (
                <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 12px', fontSize:12, color:'var(--text-secondary)' }}>
                  📍 {user.area}
                </span>
              )}
              {user?.loginCount > 0 && (
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>🔑 {user.loginCount} logins</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Activity stats (citizen only) ── */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:'1.25rem', paddingTop:'1.25rem', borderTop:'1px solid var(--border)' }}>
            {[
              { label:'Total Reports', value:stats.total,      color:'#818cf8' },
              { label:'Resolved',      value:stats.resolved,   color:'#22c55e' },
              { label:'In Progress',   value:stats.inProgress, color:'#f59e0b' },
              { label:'Pending',       value:stats.pending,    color:'#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center', background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'10px 6px', border:'1px solid var(--glass-border)' }}>
                <div style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:'var(--f-display)', lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4, textTransform:'uppercase', letterSpacing:'.04em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Profile ── */}
      <div className="card fade-up d1" style={{ marginBottom:'1.25rem' }}>
        <div className="section-label">✏️ Edit Profile</div>
        <form onSubmit={saveProfile}>

          {/* Name + Phone */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <div className="input-wrap"><span className="input-icon">👤</span>
                <input className="form-control" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name:e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <div className="input-wrap"><span className="input-icon">📱</span>
                <input className="form-control" value={form.phone} placeholder="98000 00000"
                  onChange={e => setForm(p => ({ ...p, phone:e.target.value }))} required />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Street Address</label>
            <div className="input-wrap"><span className="input-icon">🏠</span>
              <input className="form-control" value={form.address} placeholder="e.g. 12 Park Street, near Metro"
                onChange={e => setForm(p => ({ ...p, address:e.target.value }))} />
            </div>
          </div>

          {/* Area + Ward */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Area / Locality</label>
              <div className="input-wrap"><span className="input-icon">📍</span>
                <input className="form-control" value={form.area} placeholder="e.g. Salt Lake"
                  onChange={e => setForm(p => ({ ...p, area:e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ward No.</label>
              <div className="input-wrap"><span className="input-icon">🏛️</span>
                <input className="form-control" value={form.ward} placeholder="e.g. Ward 66"
                  onChange={e => setForm(p => ({ ...p, ward:e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Read-only email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrap">
              <span className="input-icon">✉️</span>
              <input className="form-control" value={user?.email || ''} readOnly
                style={{ opacity:0.6, cursor:'not-allowed' }} />
              <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:10, color:'var(--text-muted)', background:'var(--bg-card)', padding:'2px 6px', borderRadius:4 }}>read-only</span>
            </div>
          </div>

          <button className="btn btn-primary" disabled={busy1} style={{ minWidth:140 }}>
            {busy1 ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Saving…</> : '💾 Save Profile'}
          </button>
        </form>
      </div>

      {/* ── Change Password ── */}
      <div className="card fade-up d2">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showPass ? '1rem' : 0 }}>
          <div className="section-label" style={{ margin:0 }}>🔒 Change Password</div>
          <button type="button" className="btn btn-glass btn-sm" onClick={() => setShowPass(p => !p)}>
            {showPass ? '▲ Hide' : '▼ Expand'}
          </button>
        </div>

        {showPass && (
          <form onSubmit={savePassword} style={{ marginTop:'1rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div className="input-wrap"><span className="input-icon">🔒</span>
                  <input className="form-control" type="password" placeholder="••••••••"
                    value={pass.currentPassword}
                    onChange={e => setPass(p => ({ ...p, currentPassword:e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-wrap"><span className="input-icon">🔑</span>
                  <input className="form-control" type="password" placeholder="min 6 chars"
                    value={pass.newPassword}
                    onChange={e => setPass(p => ({ ...p, newPassword:e.target.value }))} required minLength={6} />
                </div>
              </div>
            </div>
            <button className="btn btn-glass" disabled={busy2} style={{ minWidth:160 }}>
              {busy2 ? <><span className="spinner-sm" style={{ borderTopColor:'var(--accent)', borderColor:'rgba(99,102,241,.2)' }} /> Updating…</> : '🔑 Change Password'}
            </button>
          </form>
        )}
      </div>

    </div>
  );
}