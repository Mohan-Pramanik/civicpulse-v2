import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdminIssues, bulkStatus, exportIssues, getImageUrl } from '../../api';
import { Spinner, StatusBadge, PriorityBadge } from '../../components/common';
import { useToast } from '../../context/ToastContext';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import api from '../../api';

const STATUSES   = ['','pending','assigned','in_progress','resolved','closed','rejected'];
const PRIORITIES = ['','low','medium','high','critical'];
const CATS       = ['','road','water','waste','electricity','encroachment','other'];

/* ── Resolve with proof modal ─────────────────────────────────────────────── */
function ResolveModal({ issue, onClose, onResolved }) {
  const [note,    setNote]    = useState('Issue has been resolved.');
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const fileRef = useRef(null);
  const { toast } = useToast();

  const pickFile = f => {
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = e => setPreview(e.target.result);
    r.readAsDataURL(f);
  };

  const submit = async () => {
    if (!file) { setErr('Proof image is required.'); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('status', 'resolved');
      fd.append('message', note);
      fd.append('proofImage', file);
      await api.put(`/issues/${issue._id}/status`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      toast(`✅ ${issue.ticketId} resolved with proof!`);
      onResolved(issue._id);
      onClose();
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
    setBusy(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'1.75rem', width:'100%', maxWidth:460, boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontFamily:'var(--f-display)', fontSize:17, fontWeight:800, color:'var(--text-primary)' }}>✅ Resolve Issue</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{issue.ticketId} · {issue.title?.slice(0,40)}{issue.title?.length>40?'…':''}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>⚠️ {err}</div>}

        <div style={{ marginBottom:'1rem' }}>
          <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
            📷 Proof Image <span style={{ color:'#ef4444' }}>*</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*"
            style={{ position:'absolute', width:1, height:1, opacity:0, pointerEvents:'none' }}
            onChange={e => pickFile(e.target.files[0])} />
          {preview ? (
            <div style={{ position:'relative', borderRadius:10, overflow:'hidden', border:'2px solid rgba(34,197,94,0.4)' }}>
              <img src={preview} alt="proof" style={{ width:'100%', height:160, objectFit:'cover', display:'block' }} />
              <button onClick={() => { setFile(null); setPreview(null); }}
                style={{ position:'absolute', top:8, right:8, background:'rgba(239,68,68,0.85)', border:'none', borderRadius:'50%', width:28, height:28, color:'#fff', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>✕</button>
              <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.6)', borderRadius:6, padding:'3px 10px', fontSize:11, color:'#4ade80', fontWeight:600 }}>✅ Proof attached</div>
            </div>
          ) : (
            <div onClick={() => { if(fileRef.current){ fileRef.current.value=''; fileRef.current.click(); } }}
              style={{ border:'2px dashed rgba(34,197,94,0.3)', borderRadius:10, padding:'1.5rem', textAlign:'center', cursor:'pointer', background:'rgba(34,197,94,0.04)', transition:'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor='rgba(34,197,94,0.6)'; e.currentTarget.style.background='rgba(34,197,94,0.08)'; }}
              onMouseOut={e  => { e.currentTarget.style.borderColor='rgba(34,197,94,0.3)'; e.currentTarget.style.background='rgba(34,197,94,0.04)'; }}>
              <div style={{ fontSize:28, marginBottom:6 }}>📷</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>Click to upload proof</div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Message to citizen</label>
          <textarea className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-glass" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2, background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 4px 16px rgba(34,197,94,0.35)' }}
            onClick={submit} disabled={busy || !file}>
            {busy ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Resolving…</> : '✅ Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function AdminIssues() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const qp = new URLSearchParams(location.search);
  const [filters,  setFilters]  = useState({ status:qp.get('status')||'', priority:qp.get('priority')||'', category:qp.get('category')||'', area:qp.get('area')||'', search:'', page:1 });
  const [issues,   setIssues]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [busy,     setBusy]     = useState(true);
  const [selected, setSelected] = useState([]);
  const [bulkSt,   setBulkSt]   = useState('');
  const [preview,  setPreview]  = useState(null);
  const [resolving,setResolving]= useState(null);

  useEffect(() => {
    setBusy(true);
    getAdminIssues(filters)
      .then(r => { setIssues(r.data.data||[]); setTotal(r.data.total||0); })
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [filters]);

  const setF = k => e => setFilters(f => ({ ...f, [k]:e.target.value, page:1 }));
  const toggleSel = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  const toggleAll = () => setSelected(selected.length===issues.length ? [] : issues.map(i=>i._id));
  const clearFilters = () => setFilters({ status:'', priority:'', category:'', area:'', search:'', page:1 });
  const hasFilters = filters.status || filters.priority || filters.category || filters.area || filters.search;

  const handleBulk = async () => {
    if (!bulkSt || !selected.length) return;
    if (bulkSt === 'resolved') { toast('Use the Resolve button on individual issues (proof image required)', 'error'); return; }
    try {
      await bulkStatus({ ids:selected, status:bulkSt });
      toast(`Updated ${selected.length} issues`);
      setSelected([]); setBulkSt('');
      setFilters(f => ({ ...f }));
    } catch { toast('Bulk update failed','error'); }
  };

  const handleExport = async () => {
    try {
      const r = await exportIssues();
      const blob = new Blob([JSON.stringify(r.data.issues,null,2)],{ type:'application/json' });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`civicpulse_${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url); toast(`Exported ${r.data.count} issues`);
    } catch { toast('Export failed','error'); }
  };

  const handleQuickStatus = async (issue, status) => {
    if (status === 'resolved') { setResolving(issue); return; }
    try {
      const fd = new FormData();
      fd.append('status', status);
      fd.append('message', `Marked ${status.replace(/_/g,' ')} by admin`);
      await api.put(`/issues/${issue._id}/status`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      setIssues(prev => prev.map(i => i._id===issue._id ? {...i, status} : i));
      toast(`✅ ${issue.ticketId} → ${status}`);
    } catch { toast('Failed','error'); }
  };

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div>
          <h1>Issue Management</h1>
          <p>{total} issues{hasFilters ? ' (filtered)' : ''}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {hasFilters && <button className="btn btn-glass btn-sm" onClick={clearFilters}>✕ Clear</button>}
          <button className="btn btn-glass btn-sm" onClick={handleExport}>⬇ Export</button>
        </div>
      </div>

      {hasFilters && (
        <div className="alert alert-info fade-up" style={{ marginBottom:'1rem' }}>
          🔍 {[filters.status&&`Status: ${filters.status}`, filters.priority&&`Priority: ${filters.priority}`, filters.category&&`Category: ${filters.category}`, filters.area&&`Area: ${filters.area}`, filters.search&&`Search: "${filters.search}"`].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Filters */}
      <div className="card fade-up d1" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:2, minWidth:160, position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none' }}>🔍</span>
            <input className="form-control" style={{ paddingLeft:38 }} placeholder="Search title or ticket…" value={filters.search} onChange={setF('search')} />
          </div>
          {[
            { label:'Status',   key:'status',   opts:STATUSES },
            { label:'Priority', key:'priority', opts:PRIORITIES },
            { label:'Category', key:'category', opts:CATS },
          ].map(({ label, key, opts }) => (
            <select key={key} className="form-control" style={{ width:140 }} value={filters[key]} onChange={setF(key)}>
              {opts.map(o => <option key={o} value={o}>{o||`All ${label}`}</option>)}
            </select>
          ))}
          <input className="form-control" style={{ width:130 }} placeholder="Area…" value={filters.area} onChange={setF('area')} />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="alert alert-info fade-up" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem', flexWrap:'wrap' }}>
          <strong>{selected.length}</strong> selected
          <select className="form-control" style={{ width:200 }} value={bulkSt} onChange={e=>setBulkSt(e.target.value)}>
            <option value="">Change status to…</option>
            {['assigned','in_progress','closed','rejected'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleBulk} disabled={!bulkSt}>Apply</button>
          <button className="btn btn-glass btn-sm"  onClick={() => setSelected([])}>Deselect all</button>
        </div>
      )}

      {/* Table */}
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
                  <th className="hide-mobile">Reporter</th>
                  <th className="hide-mobile">Officer</th>
                  <th className="hide-mobile">Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue._id}>
                    <td><input type="checkbox" checked={selected.includes(issue._id)} onChange={() => toggleSel(issue._id)} style={{ accentColor:'#6366f1' }} /></td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:700, background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', fontFamily:'var(--f-display)' }}>
                        {issue.ticketId}
                      </span>
                    </td>
                    <td style={{ maxWidth:180 }}>
                      <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-primary)' }}>{issue.title}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{issue.location?.area||issue.location?.address}</div>
                    </td>
                    <td><span style={{ fontSize:12, textTransform:'capitalize', color:'var(--text-secondary)' }}>{issue.category}</span></td>
                    <td><PriorityBadge priority={issue.priority} /></td>
                    <td><StatusBadge   status={issue.status} /></td>
                    <td className="hide-mobile">
                      {issue.reportedBy ? (
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{issue.reportedBy.name}</div>
                          {issue.reportedBy.phone && <div style={{ fontSize:11, color:'var(--text-muted)' }}>📞 {issue.reportedBy.phone}</div>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="hide-mobile">
                      {issue.assignedTo ? (
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:'#06b6d4' }}>{issue.assignedTo.name}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{issue.assignedTo.department?.split(' ').slice(0,2).join(' ')}</div>
                        </div>
                      ) : <span style={{ fontSize:11, color:'var(--text-muted)' }}>Unassigned</span>}
                    </td>
                    <td className="hide-mobile" style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <button className="btn btn-glass btn-sm" onClick={() => navigate(`/issues/${issue._id}`)}>View</button>
                        {!['resolved','closed'].includes(issue.status) && (
                          <button className="btn btn-sm"
                            style={{ background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'var(--r-sm)', fontSize:11, padding:'4px 8px' }}
                            onClick={() => handleQuickStatus(issue, 'resolved')}>
                            ✅
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issues.length === 0 && (
              <div style={{ textAlign:'center', padding:'2.5rem', color:'var(--text-muted)', fontSize:13 }}>
                No issues match these filters.
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {total > 25 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:'1rem' }}>
            <button className="btn btn-glass btn-sm" disabled={filters.page<=1} onClick={() => setFilters(f=>({...f,page:f.page-1}))}>← Prev</button>
            <span style={{ padding:'7px 14px', fontSize:13, color:'var(--text-muted)', background:'var(--hover-bg)', borderRadius:'var(--r-sm)', border:'1px solid var(--glass-border)' }}>
              Page {filters.page} of {Math.ceil(total/25)}
            </span>
            <button className="btn btn-glass btn-sm" disabled={filters.page>=Math.ceil(total/25)} onClick={() => setFilters(f=>({...f,page:f.page+1}))}>Next →</button>
          </div>
        )}
      </div>

      {preview && <ImagePreviewModal images={preview.images} startIndex={preview.idx} onClose={() => setPreview(null)} />}
      {resolving && <ResolveModal issue={resolving} onClose={() => setResolving(null)} onResolved={id => { setIssues(prev => prev.map(i => i._id===id ? {...i,status:'resolved'} : i)); }} />}
    </div>
  );
}