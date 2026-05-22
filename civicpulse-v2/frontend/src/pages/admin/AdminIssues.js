import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdminIssues, bulkStatus, exportIssues } from '../../api';
import { Spinner, StatusBadge, PriorityBadge } from '../../components/common';
import { useToast } from '../../context/ToastContext';

const STATUSES   = ['','pending','assigned','in_progress','resolved','closed','rejected'];
const PRIORITIES = ['','low','medium','high','critical'];
const CATS       = ['','road','water','waste','electricity','encroachment','other'];

export default function AdminIssues() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Read filters from URL query params (so KPI clicks work)
  const qp = new URLSearchParams(location.search);
  const [filters, setFilters] = useState({
    status:   qp.get('status')   || '',
    priority: qp.get('priority') || '',
    category: qp.get('category') || '',
    area:     qp.get('area')     || '',
    page: 1,
  });
  const [issues,   setIssues]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [busy,     setBusy]     = useState(true);
  const [selected, setSelected] = useState([]);
  const [bulkSt,   setBulkSt]   = useState('');

  useEffect(() => {
    setBusy(true);
    getAdminIssues(filters).then(r => { setIssues(r.data.data||[]); setTotal(r.data.total||0); }).catch(()=>{}).finally(()=>setBusy(false));
  }, [filters]);

  const setF = k => e => setFilters(f => ({ ...f, [k]: e.target.value, page:1 }));
  const toggleSel = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  const toggleAll = () => setSelected(selected.length===issues.length ? [] : issues.map(i=>i._id));

  const handleBulk = async () => {
    if (!bulkSt || !selected.length) return;
    try { await bulkStatus({ ids:selected, status:bulkSt }); toast(`Updated ${selected.length} issues`); setSelected([]); setBulkSt(''); setFilters(f=>({...f})); }
    catch { toast('Bulk update failed','error'); }
  };

  const handleExport = async () => {
    try {
      const r = await exportIssues();
      const blob = new Blob([JSON.stringify(r.data.issues,null,2)],{type:'application/json'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href=url; a.download=`civicpulse_${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url); toast(`Exported ${r.data.count} issues`);
    } catch { toast('Export failed','error'); }
  };

  const clearFilters = () => setFilters({ status:'', priority:'', category:'', area:'', page:1 });
  const hasFilters = filters.status || filters.priority || filters.category || filters.area;

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div>
          <h1>Issue Management</h1>
          <p>{total} issues{hasFilters ? ' (filtered)' : ''}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {hasFilters && <button className="btn btn-glass btn-sm" onClick={clearFilters}>✕ Clear Filters</button>}
          <button className="btn btn-glass btn-sm" onClick={handleExport}>⬇ Export</button>
        </div>
      </div>

      {/* Active filter banner */}
      {hasFilters && (
        <div className="alert alert-info fade-up" style={{ marginBottom:'1rem' }}>
          🔍 Showing: {[filters.status && `Status: ${filters.status}`, filters.priority && `Priority: ${filters.priority}`, filters.category && `Category: ${filters.category}`, filters.area && `Area: ${filters.area}`].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Filters */}
      <div className="card fade-up d1" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[
            { label:'Status',   key:'status',   opts:STATUSES },
            { label:'Priority', key:'priority', opts:PRIORITIES },
            { label:'Category', key:'category', opts:CATS },
          ].map(({ label, key, opts }) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              <select className="form-control" style={{ width:140 }} value={filters[key]} onChange={setF(key)}>
                {opts.map(o => <option key={o} value={o}>{o||`All ${label}`}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="form-label">Area</label>
            <input className="form-control" style={{ width:140 }} placeholder="e.g. Salt Lake" value={filters.area} onChange={setF('area')} />
          </div>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Clear</button>}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="alert alert-info fade-up" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
          <strong>{selected.length}</strong> selected
          <select className="form-control" style={{ width:180 }} value={bulkSt} onChange={e=>setBulkSt(e.target.value)}>
            <option value="">Change status to…</option>
            {['assigned','in_progress','resolved','closed','rejected'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleBulk} disabled={!bulkSt}>Apply</button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setSelected([])}>Deselect</button>
        </div>
      )}

      <div className="card fade-up d2">
        {busy ? <Spinner /> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" onChange={toggleAll} checked={selected.length===issues.length&&issues.length>0} style={{ accentColor:'#6366f1' }} /></th>
                  <th>Ticket</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th className="hide-mobile">Location</th>
                  <th className="hide-mobile">Reporter</th>
                  <th className="hide-mobile">Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue._id}>
                    <td><input type="checkbox" checked={selected.includes(issue._id)} onChange={()=>toggleSel(issue._id)} style={{ accentColor:'#6366f1' }} /></td>
                    <td><span style={{ fontSize:11, fontWeight:700, background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', fontFamily:'var(--f-display)' }}>{issue.ticketId}</span></td>
                    <td style={{ maxWidth:180 }}><div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-primary)' }}>{issue.title}</div></td>
                    <td><span style={{ fontSize:12, textTransform:'capitalize', color:'var(--text-secondary)' }}>{issue.category}</span></td>
                    <td><PriorityBadge priority={issue.priority} /></td>
                    <td><StatusBadge status={issue.status} /></td>
                    <td className="hide-mobile" style={{ fontSize:12 }}>{issue.location?.area||issue.location?.address}</td>
                    <td className="hide-mobile" style={{ fontSize:12 }}>{issue.reportedBy?.name}</td>
                    <td className="hide-mobile" style={{ fontSize:12 }}>{new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-glass btn-sm" onClick={()=>navigate(`/issues/${issue._id}`)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issues.length===0 && <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)', fontSize:13 }}>No issues match these filters.</div>}
          </div>
        )}
        {total > 25 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:'1rem' }}>
            <button className="btn btn-glass btn-sm" disabled={filters.page<=1} onClick={()=>setFilters(f=>({...f,page:f.page-1}))}>← Prev</button>
            <span style={{ padding:'7px 14px', fontSize:13, color:'var(--text-muted)', background:'var(--glass)', borderRadius:'var(--r-xs)', border:'1px solid var(--glass-border)' }}>Page {filters.page} of {Math.ceil(total/25)}</span>
            <button className="btn btn-glass btn-sm" disabled={filters.page>=Math.ceil(total/25)} onClick={()=>setFilters(f=>({...f,page:f.page+1}))}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}