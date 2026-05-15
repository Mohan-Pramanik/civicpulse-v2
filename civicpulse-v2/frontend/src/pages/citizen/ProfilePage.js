import React, { useState } from 'react';
import { updateProfile, updatePassword } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user?.name||'', phone: user?.phone||'', area: user?.area||'', ward: user?.ward||'' });
  const [pass, setPass] = useState({ currentPassword: '', newPassword: '' });
  const [busy1, setBusy1] = useState(false);
  const [busy2, setBusy2] = useState(false);

  const saveProfile = async e => {
    e.preventDefault(); setBusy1(true);
    try { await updateProfile(form); await refreshUser(); toast('Profile updated ✓'); }
    catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    setBusy1(false);
  };

  const savePassword = async e => {
    e.preventDefault(); setBusy2(true);
    try { await updatePassword(pass); setPass({ currentPassword:'', newPassword:'' }); toast('Password changed ✓'); }
    catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    setBusy2(false);
  };

  const ROLE_BADGE = { admin:'badge-red', department:'badge-blue', citizen:'badge-green' };

  return (
    <div className="page page-narrow">
      {/* Hero */}
      <div className="card fade-up" style={{ marginBottom:'1rem', background:'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(34,197,94,0.05))', borderColor:'rgba(99,102,241,0.2)' }}>
        <div style={{ display:'flex', gap:18, alignItems:'center' }}>
          <div style={{ width:66, height:66, borderRadius:'50%', background:'linear-gradient(135deg, #6366f1, #22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-display)', fontSize:26, fontWeight:800, color:'#fff', flexShrink:0, boxShadow:'0 8px 24px rgba(99,102,241,0.4)' }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--f-display)', fontSize:20, fontWeight:800, color:'var(--text-primary)' }}>{user?.name}</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{user?.email}</div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:10, flexWrap:'wrap' }}>
              <span className={`badge ${ROLE_BADGE[user?.role] || 'badge-gray'}`}>{user?.role}</span>
              {user?.area && <span className="badge badge-gray">📍 {user.area}</span>}
              {user?.loginCount > 0 && <span style={{ fontSize:11, color:'var(--text-muted)' }}>🔑 {user.loginCount} logins</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="card fade-up d1" style={{ marginBottom:'1rem' }}>
        <div className="section-label">✏️ Edit Profile</div>
        <form onSubmit={saveProfile}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <div className="input-wrap"><span className="input-icon">👤</span>
                <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <div className="input-wrap"><span className="input-icon">📱</span>
                <input className="form-control" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="98000 00000" />
              </div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Area / Locality</label>
              <div className="input-wrap"><span className="input-icon">📍</span>
                <input className="form-control" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="e.g. Salt Lake" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ward no.</label>
              <div className="input-wrap"><span className="input-icon">🏛️</span>
                <input className="form-control" value={form.ward} onChange={e => setForm(p => ({ ...p, ward: e.target.value }))} placeholder="e.g. Ward 66" />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy1}>{busy1 ? 'Saving…' : '💾 Save Profile'}</button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card fade-up d2">
        <div className="section-label">🔐 Change Password</div>
        <form onSubmit={savePassword}>
          <div className="form-group">
            <label className="form-label">Current password</label>
            <div className="input-wrap"><span className="input-icon">🔒</span>
              <input className="form-control" type="password" value={pass.currentPassword} onChange={e => setPass(p => ({ ...p, currentPassword: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">New password</label>
            <div className="input-wrap"><span className="input-icon">🔑</span>
              <input className="form-control" type="password" value={pass.newPassword} onChange={e => setPass(p => ({ ...p, newPassword: e.target.value }))} required />
            </div>
          </div>
          <button className="btn btn-glass" disabled={busy2}>{busy2 ? 'Updating…' : '🔄 Change Password'}</button>
        </form>
      </div>
    </div>
  );
}
