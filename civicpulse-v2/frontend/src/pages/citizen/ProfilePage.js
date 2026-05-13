import React, { useState } from 'react';
import { updateProfile, updatePassword } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm]   = useState({ name:user?.name||'', phone:user?.phone||'', area:user?.area||'', ward:user?.ward||'' });
  const [pass, setPass]   = useState({ currentPassword:'', newPassword:'' });
  const [busy1, setBusy1] = useState(false);
  const [busy2, setBusy2] = useState(false);

  const saveProfile = async e => {
    e.preventDefault(); setBusy1(true);
    try {
      await updateProfile(form); await refreshUser();
      toast('Profile updated ✓');
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    setBusy1(false);
  };

  const savePassword = async e => {
    e.preventDefault(); setBusy2(true);
    try {
      await updatePassword(pass);
      setPass({ currentPassword:'', newPassword:'' });
      toast('Password changed ✓');
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    setBusy2(false);
  };

  const f1 = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const f2 = k => e => setPass(p=>({...p,[k]:e.target.value}));

  return (
    <div className="page page-narrow">
      <h1 style={{ fontSize:20, fontWeight:700, marginBottom:'1.5rem' }}>My Profile</h1>

      <div className="card" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:'1.25rem' }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--green-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            👤
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>{user?.name}</div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>{user?.email}</div>
            <span className={`badge ${user?.role==='admin'?'badge-red':user?.role==='department'?'badge-blue':'badge-green'}`} style={{ marginTop:4 }}>
              {user?.role}
            </span>
          </div>
        </div>

        <div className="section-label">Edit Profile</div>
        <form onSubmit={saveProfile}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-control" value={form.name} onChange={f1('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={f1('phone')} placeholder="98000 00000" />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Area</label>
              <input className="form-control" value={form.area} onChange={f1('area')} placeholder="e.g. Salt Lake" />
            </div>
            <div className="form-group">
              <label className="form-label">Ward no.</label>
              <input className="form-control" value={form.ward} onChange={f1('ward')} placeholder="e.g. Ward 66" />
            </div>
          </div>
          <button className="btn btn-primary" disabled={busy1}>{busy1?'Saving…':'Save Profile'}</button>
        </form>
      </div>

      <div className="card">
        <div className="section-label">Change Password</div>
        <form onSubmit={savePassword}>
          <div className="form-group">
            <label className="form-label">Current password</label>
            <input className="form-control" type="password" value={pass.currentPassword} onChange={f2('currentPassword')} required />
          </div>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input className="form-control" type="password" value={pass.newPassword} onChange={f2('newPassword')} required />
          </div>
          <button className="btn btn-outline" disabled={busy2}>{busy2?'Updating…':'Change Password'}</button>
        </form>
      </div>
    </div>
  );
}
