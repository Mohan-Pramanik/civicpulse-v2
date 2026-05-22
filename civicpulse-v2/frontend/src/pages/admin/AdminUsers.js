import React, { useState, useEffect } from 'react';
import { getAdminUsers, updateUser, deleteUser, createUser } from '../../api';
import { Spinner } from '../../components/common';
import { useToast } from '../../context/ToastContext';

const DEPTS = ['','Public Works Department (PWD)','KMC Water Supply Department','Sanitation & Solid Waste Dept','CESC / KMC Lighting Division','KMC Enforcement Team','KMC General Grievance Cell'];

const CREDS = [
  { dept:'Public Works Department (PWD)',   head:'pwd@civicpulse.in',         hpass:'pwd@123',          officer:'pwd.officer@civicpulse.in',         opass:'pwd.officer@123' },
  { dept:'KMC Water Supply Department',     head:'water@civicpulse.in',       hpass:'water@123',        officer:'water.officer@civicpulse.in',       opass:'water.officer@123' },
  { dept:'Sanitation & Solid Waste Dept',   head:'sanitation@civicpulse.in',  hpass:'sanitation@123',   officer:'sanitation.officer@civicpulse.in',  opass:'sanitation.officer@123' },
  { dept:'CESC / KMC Lighting Division',   head:'electricity@civicpulse.in', hpass:'electricity@123',  officer:'electricity.officer@civicpulse.in', opass:'electricity.officer@123' },
  { dept:'KMC Enforcement Team',           head:'enforcement@civicpulse.in', hpass:'enforcement@123',  officer:'enforcement.officer@civicpulse.in', opass:'enforcement.officer@123' },
  { dept:'KMC General Grievance Cell',     head:'grievance@civicpulse.in',   hpass:'grievance@123',    officer:'grievance.officer@civicpulse.in',   opass:'grievance.officer@123' },
];

export default function AdminUsers() {
  const [users,     setUsers]     = useState([]);
  const [busy,      setBusy]      = useState(true);
  const [editing,   setEditing]   = useState(null);
  const [creating,  setCreating]  = useState(false);
  const [showCreds, setShowCreds] = useState(false);
  const [seedBusy,  setSeedBusy]  = useState(false);
  const [newUser,   setNewUser]   = useState({ name:'', email:'', password:'', role:'department', department:'', isHead:false });
  const { toast } = useToast();

  const load = () => {
    setBusy(true);
    getAdminUsers().then(r => setUsers(r.data.data||[])).catch(()=>{}).finally(()=>setBusy(false));
  };
  useEffect(load, []);

  const saveEdit = async () => {
    try {
      const r = await updateUser(editing._id, { role:editing.role, department:editing.department, isActive:editing.isActive, isHead:editing.isHead });
      setUsers(u => u.map(x => x._id===editing._id ? r.data.user : x));
      setEditing(null); toast('User updated ✓');
    } catch { toast('Update failed','error'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try { await deleteUser(id); setUsers(u=>u.filter(x=>x._id!==id)); toast('User deleted'); }
    catch { toast('Delete failed','error'); }
  };

  const handleCreate = async e => {
    e.preventDefault();
    try {
      const r = await createUser(newUser);
      setUsers(u => [r.data.user,...u]);
      setCreating(false);
      setNewUser({ name:'', email:'', password:'', role:'department', department:'', isHead:false });
      toast('User created ✓');
    } catch (err) { toast(err.response?.data?.message||'Failed','error'); }
  };

  const handleSeed = async () => {
    setSeedBusy(true);
    try {
      const base = (process.env.REACT_APP_API_URL||'http://localhost:5000/api').replace('/api','');
      const r    = await fetch(`${base}/api/auth/seed-departments`);
      const data = await r.json();
      toast(`✅ ${data.message}`);
      load();
    } catch { toast('Seed failed','error'); }
    setSeedBusy(false);
  };

  const roleColor = r => ({ admin:'badge-red', department:'badge-blue', citizen:'badge-green' }[r]||'badge-gray');

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div><h1>User Management</h1><p>{users.length} registered users</p></div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-glass btn-sm" onClick={()=>setShowCreds(c=>!c)}>🔑 Credentials</button>
          <button className="btn btn-glass btn-sm" onClick={handleSeed} disabled={seedBusy}>
            {seedBusy ? '⏳ Seeding…' : '🌱 Seed Departments'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={()=>setCreating(true)}>➕ Add User</button>
        </div>
      </div>

      {/* Credentials Reference */}
      {showCreds && (
        <div className="card fade-up" style={{ marginBottom:'1rem', background:'rgba(99,102,241,0.05)', borderColor:'rgba(99,102,241,0.2)' }}>
          <div className="section-label">🔑 All Department Login Credentials</div>
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Head Email</th>
                  <th>Head Pass</th>
                  <th>Officer Email</th>
                  <th>Officer Pass</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color:'var(--text-primary)', fontWeight:600, fontSize:12 }}>Admin</td>
                  <td style={{ fontSize:11, color:'#f87171', fontFamily:'monospace' }}>admin@civicpulse.in</td>
                  <td style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>password123</td>
                  <td>—</td><td>—</td>
                </tr>
                {CREDS.map((c,i)=>(
                  <tr key={i}>
                    <td style={{ color:'var(--text-primary)', fontWeight:600, fontSize:12 }}>{c.dept}</td>
                    <td style={{ fontSize:11, color:'#818cf8', fontFamily:'monospace' }}>{c.head}</td>
                    <td style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{c.hpass}</td>
                    <td style={{ fontSize:11, color:'#06b6d4', fontFamily:'monospace' }}>{c.officer}</td>
                    <td style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>{c.opass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
            💡 Click <strong>🌱 Seed Departments</strong> to auto-create all accounts in the database.
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card fade-up d1">
        {busy ? <Spinner /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th className="hide-mobile">Phone</th>
                  <th>Role</th>
                  <th>Head</th>
                  <th className="hide-mobile">Department</th>
                  <th className="hide-mobile">Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u._id}>
                    <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{u.name}</td>
                    <td style={{ fontSize:13 }}>{u.email}</td>
                    <td className="hide-mobile" style={{ fontSize:13 }}>{u.phone||'—'}</td>
                    <td><span className={`badge ${roleColor(u.role)}`}>{u.role}</span></td>
                    <td>{u.role==='department' ? (u.isHead ? <span className="badge badge-violet">Head</span> : <span className="badge badge-gray">Officer</span>) : '—'}</td>
                    <td className="hide-mobile" style={{ fontSize:12, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.department||'—'}</td>
                    <td className="hide-mobile" style={{ fontSize:12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td><span className={`badge ${u.isActive!==false?'badge-green':'badge-gray'}`}>{u.isActive!==false?'Active':'Inactive'}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-glass btn-sm" onClick={()=>setEditing({...u})}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(u._id,u.name)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {creating && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:'1rem' }}
          onClick={e=>e.target===e.currentTarget&&setCreating(false)}>
          <div className="card scale-in" style={{ width:'100%', maxWidth:460, background:'rgba(15,23,42,0.98)', border:'1px solid var(--glass-border)', boxShadow:'var(--s-xl)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h2 style={{ fontSize:16, fontWeight:800, fontFamily:'var(--f-display)', color:'var(--text-primary)' }}>Create User Account</h2>
              <button className="btn btn-ghost btn-sm" onClick={()=>setCreating(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-control" value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))} required placeholder="e.g. Rajesh Kumar" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={newUser.email} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} required placeholder="min 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                  <option value="citizen">Citizen</option>
                  <option value="department">Department Officer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {newUser.role==='department' && (<>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-control" value={newUser.department} onChange={e=>setNewUser(p=>({...p,department:e.target.value}))} required>
                    {DEPTS.map(d=><option key={d} value={d}>{d||'Select department…'}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input type="checkbox" id="isHead" checked={newUser.isHead} onChange={e=>setNewUser(p=>({...p,isHead:e.target.checked}))} style={{ accentColor:'#6366f1', width:16, height:16 }} />
                  <label htmlFor="isHead" className="form-label" style={{ margin:0, cursor:'pointer' }}>Is Department Head</label>
                </div>
              </>)}
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" className="btn btn-primary">Create Account</button>
                <button type="button" className="btn btn-glass" onClick={()=>setCreating(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:'1rem' }}
          onClick={e=>e.target===e.currentTarget&&setEditing(null)}>
          <div className="card scale-in" style={{ width:'100%', maxWidth:440, background:'rgba(15,23,42,0.98)', border:'1px solid var(--glass-border)', boxShadow:'var(--s-xl)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <h2 style={{ fontSize:16, fontWeight:800, fontFamily:'var(--f-display)', color:'var(--text-primary)' }}>Edit: {editing.name}</h2>
              <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={editing.role} onChange={e=>setEditing(x=>({...x,role:e.target.value}))}>
                <option value="citizen">Citizen</option>
                <option value="department">Department Officer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {editing.role==='department' && (<>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-control" value={editing.department||''} onChange={e=>setEditing(x=>({...x,department:e.target.value}))}>
                  {DEPTS.map(d=><option key={d} value={d}>{d||'Select…'}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" id="editIsHead" checked={editing.isHead||false} onChange={e=>setEditing(x=>({...x,isHead:e.target.checked}))} style={{ accentColor:'#6366f1', width:16, height:16 }} />
                <label htmlFor="editIsHead" className="form-label" style={{ margin:0, cursor:'pointer' }}>Is Department Head</label>
              </div>
            </>)}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={editing.isActive!==false?'true':'false'} onChange={e=>setEditing(x=>({...x,isActive:e.target.value==='true'}))}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
              <button className="btn btn-glass" onClick={()=>setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}