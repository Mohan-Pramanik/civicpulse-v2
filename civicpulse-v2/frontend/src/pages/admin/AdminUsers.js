import React, { useState, useEffect } from 'react';
import { getAdminUsers, updateUser, deleteUser } from '../../api';
import { Spinner } from '../../components/common';
import { useToast } from '../../context/ToastContext';

const DEPTS = [
  '', 'Public Works Department (PWD)', 'KMC Water Supply Department',
  'Sanitation & Solid Waste Dept', 'CESC / KMC Lighting Division',
  'KMC Enforcement Team', 'KMC General Grievance Cell'
];

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [busy,    setBusy]    = useState(true);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    getAdminUsers().then(r => setUsers(r.data.data||[])).catch(()=>{}).finally(()=>setBusy(false));
  }, []);

  const saveEdit = async () => {
    try {
      const r = await updateUser(editing._id, { role: editing.role, department: editing.department, isActive: editing.isActive });
      setUsers(u => u.map(x => x._id===editing._id ? r.data.user : x));
      setEditing(null); toast('User updated ✓');
    } catch { toast('Update failed', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try { await deleteUser(id); setUsers(u => u.filter(x=>x._id!==id)); toast('User deleted'); }
    catch { toast('Delete failed', 'error'); }
  };

  const roleColor = r => ({ admin:'badge-red', department:'badge-blue', citizen:'badge-green' }[r]||'badge-gray');

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div><h1>User Management</h1><p>{users.length} registered users</p></div>
      </div>

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
                  <th className="hide-mobile">Department</th>
                  <th className="hide-mobile">Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{u.name}</td>
                    <td style={{ fontSize:13 }}>{u.email}</td>
                    <td className="hide-mobile" style={{ fontSize:13 }}>{u.phone||'—'}</td>
                    <td><span className={`badge ${roleColor(u.role)}`}>{u.role}</span></td>
                    <td className="hide-mobile" style={{ fontSize:12 }}>{u.department||'—'}</td>
                    <td className="hide-mobile" style={{ fontSize:12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td><span className={`badge ${u.isActive?'badge-green':'badge-gray'}`}>{u.isActive?'Active':'Inactive'}</span></td>
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

      {/* Edit modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:'1rem' }}
          onClick={e => e.target===e.currentTarget && setEditing(null)}>
          <div className="card scale-in" style={{ width:'100%', maxWidth:440, background:'rgba(15,23,42,0.98)', border:'1px solid var(--glass-border)', boxShadow:'var(--s-xl), 0 0 40px rgba(99,102,241,0.1)' }}>
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
            {editing.role==='department' && (
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-control" value={editing.department||''} onChange={e=>setEditing(x=>({...x,department:e.target.value}))}>
                  {DEPTS.map(d=><option key={d} value={d}>{d||'Select department…'}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select className="form-control" value={editing.isActive?'true':'false'} onChange={e=>setEditing(x=>({...x,isActive:e.target.value==='true'}))}>
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