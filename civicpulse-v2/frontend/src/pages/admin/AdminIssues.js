import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminIssues, bulkStatus, exportIssues } from '../../api';
import { Spinner, StatusBadge, PriorityBadge } from '../../components/common';
import { useToast } from '../../context/ToastContext';

const STATUSES   = ['','pending','assigned','in_progress','resolved','closed','rejected'];
const PRIORITIES = ['','low','medium','high','critical'];
const CATS       = ['','road','water','waste','electricity','encroachment','other'];

export default function AdminIssues() {
  const [issues,   setIssues]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [busy,     setBusy]     = useState(true);
  const [selected, setSelected] = useState([]);
  const [filters,  setFilters]  = useState({ status:'', priority:'', category:'', page:1 });
  const [bulkSt,   setBulkSt]   = useState('');
  const { toast } = useToast();
  const navigate  = useNavigate();

  const load = () => {
    setBusy(true);
    getAdminIssues(filters)
      .then(r => { setIssues(r.data.data||[]); setTotal(r.data.total||0); })
      .catch(()=>{})
      .finally(()=>setBusy(false));
  };

  useEffect(load, [filters]);

  const setF = k => e => setFilters(f => ({ ...f, [k]:e.target.value, page:1 }));

  const toggleSel = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  const toggleAll = () => setSelected(selected.length===issues.length ? [] : issues.map(i=>i._id));

  const handleBulk = async () => {
    if (!bulkSt || selected.length===0) return;
    try {
      await bulkStatus({ ids:selected, status:bulkSt });
      toast(`Updated ${selected.length} issues to "${bulkSt}"`);
      setSelected([]); setBulkSt(''); load();
    } catch { toast('Bulk update failed', 'error'); }
  };

  const handleExport = async () => {
    try {
      const r = await exportIssues();
      const json = JSON.stringify(r.data.issues, null, 2);
      const blob = new Blob([json], { type:'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `civicpulse_export_${Date.now()}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast(`Exported ${r.data.count} issues`);
    } catch { toast('Export failed', 'error'); }
  };

  return (
    <div className="page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>Issue Management</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{total} total issues</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExport}>⬇ Export JSON</button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[
            { label:'Status',   key:'status',   opts:STATUSES   },
            { label:'Priority', key:'priority', opts:PRIORITIES },
            { label:'Category', key:'category', opts:CATS       },
          ].map(({ label, key, opts }) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              <select className="form-control" style={{ width:140 }} value={filters[key]} onChange={setF(key)}>
                {opts.map(o => <option key={o} value={o}>{o||'All'}</option>)}
              </select>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status:'', priority:'', category:'', page:1 })}>
            Clear
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="alert alert-info" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
          <strong>{selected.length}</strong> selected
          <select className="form-control" style={{ width:160 }} value={bulkSt} onChange={e=>setBulkSt(e.target.value)}>
            <option value="">Change status to…</option>
            {['assigned','in_progress','resolved','closed','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleBulk} disabled={!bulkSt}>Apply</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setSelected([])}>Deselect</button>
        </div>
      )}

      <div className="card">
        {busy ? <Spinner /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" onChange={toggleAll} checked={selected.length===issues.length&&issues.length>0} /></th>
                  <th>Ticket</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Reporter</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue._id}>
                    <td><input type="checkbox" checked={selected.includes(issue._id)} onChange={()=>toggleSel(issue._id)} /></td>
                    <td><span style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>{issue.ticketId}</span></td>
                    <td style={{ maxWidth:200 }}>
                      <div style={{ fontWeight:500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {issue.title}
                      </div>
                    </td>
                    <td><span style={{ fontSize:12, textTransform:'capitalize' }}>{issue.category}</span></td>
                    <td><PriorityBadge priority={issue.priority} /></td>
                    <td><StatusBadge status={issue.status} /></td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{issue.location?.area || issue.location?.address}</td>
                    <td style={{ fontSize:12 }}>{issue.reportedBy?.name}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={()=>navigate(`/issues/${issue._id}`)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issues.length === 0 && (
              <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>No issues match these filters.</div>
            )}
          </div>
        )}

        {/* Pagination */}
        {total > 25 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:'1rem' }}>
            <button className="btn btn-outline btn-sm" disabled={filters.page<=1}
              onClick={()=>setFilters(f=>({...f,page:f.page-1}))}>← Prev</button>
            <span style={{ padding:'6px 12px', fontSize:13, color:'var(--text-muted)' }}>
              Page {filters.page} of {Math.ceil(total/25)}
            </span>
            <button className="btn btn-outline btn-sm" disabled={filters.page>=Math.ceil(total/25)}
              onClick={()=>setFilters(f=>({...f,page:f.page+1}))}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
