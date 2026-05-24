import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminIssues, getDeptStats, assignOfficer, getMyOfficers, createOfficer, getImageUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Spinner, StatusBadge, PriorityBadge, SkeletonCard } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import api from '../../api';

const PRIO_COLOR = { critical:'#ef4444', high:'#f59e0b', medium:'#06b6d4', low:'#22c55e' };

/* ── Resolve Modal — proof image required ──────────────────────────────────── */
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
      fd.append('status',     'resolved');
      fd.append('message',    note);
      fd.append('proofImage', file);
      await api.put(`/issues/${issue._id}/status`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      toast(`✅ ${issue.ticketId} resolved with proof!`);
      onResolved(issue._id);
      onClose();
    } catch (e) { setErr(e.response?.data?.message || 'Failed to resolve'); }
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
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{issue.ticketId}</div>
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
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>Click to upload proof of resolution</div>
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

/* ── Create Officer Modal ──────────────────────────────────────────────────── */
function CreateOfficerModal({ department, onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const { toast } = useToast();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await createOfficer({ ...form, department });
      toast(`✅ Officer ${r.data.user.name} created!`);
      onCreated(r.data.user);
      onClose();
    } catch (err) { setErr(err.response?.data?.message || 'Failed to create officer'); }
    setBusy(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'1.75rem', width:'100%', maxWidth:440, boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontFamily:'var(--f-display)', fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>➕ Add Field Officer</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>🏛️ {department}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer', padding:4 }}>✕</button>
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>⚠️ {err}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <div className="input-wrap"><span className="input-icon">👤</span>
              <input className="form-control" placeholder="e.g. Ravi Kumar" value={form.name} onChange={set('name')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <div className="input-wrap"><span className="input-icon">✉️</span>
              <input className="form-control" type="email" placeholder="officer@civicpulse.in" value={form.email} onChange={set('email')} required />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <div className="input-wrap"><span className="input-icon">📱</span>
                <input className="form-control" placeholder="98000 00000" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div className="input-wrap"><span className="input-icon">🔒</span>
                <input className="form-control" type="password" placeholder="min 6 chars" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button type="button" className="btn btn-glass" style={{ flex:1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex:2 }} disabled={busy}>
              {busy ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Creating…</> : '✅ Create Officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Dashboard ────────────────────────────────────────────────────────── */
export default function DepartmentHeadDashboard() {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [issues,    setIssues]    = useState([]);
  const [officers,  setOfficers]  = useState([]);
  const [kpis,      setKpis]      = useState(null);
  const [busy,      setBusy]      = useState(true);
  const [filters,   setFilters]   = useState({ status:'', priority:'' });
  const [search,    setSearch]    = useState('');
  const [assignMap, setAssignMap] = useState({});
  const [preview,   setPreview]   = useState(null);
  const [showCreate,setShowCreate]= useState(false);
  const [resolving, setResolving] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [iRes, kRes, oRes] = await Promise.all([
        getAdminIssues({ ...filters, limit:100 }),
        getDeptStats(),
        getMyOfficers(),
      ]);
      setIssues(iRes.data.data || []);
      setKpis(kRes.data.kpis);
      setOfficers(oRes.data.officers || []);
    } catch {}
    setBusy(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (issueId) => {
    const officerId = assignMap[issueId];
    if (!officerId) return toast('Select an officer first','error');
    try {
      const r = await assignOfficer(issueId, officerId);
      const updated = r.data.issue;
      setIssues(prev => prev.map(i => i._id === issueId ? updated : i));
      toast(`✅ Issue assigned to ${updated.assignedTo?.name}`);
      // Keep selected officer in dropdown after assignment
      setAssignMap(m => ({ ...m, [issueId]: updated.assignedTo?._id || m[issueId] }));
    } catch { toast('Assignment failed','error'); }
  };

  const handleStatus = async (issueId, status) => {
    try {
      await updateStatus(issueId, { status, message:`Marked ${status.replace(/_/g,' ')} by dept head` });
      setIssues(prev => prev.map(i => i._id === issueId ? {...i, status} : i));
      toast(`✅ ${status.replace(/_/g,' ')}`);
    } catch { toast('Failed','error'); }
  };

  const sorted = [...issues]
    .filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.ticketId?.includes(search.toUpperCase()))
    .sort((a,b) => ({ critical:0, high:1, medium:2, low:3 }[a.priority]||4) - ({ critical:0, high:1, medium:2, low:3 }[b.priority]||4));

  const KPI = [
    { key:'total',      label:'Total Issues', icon:'📋', color:'#6366f1', glow:'rgba(99,102,241,0.3)' },
    { key:'pending',    label:'Pending',      icon:'🔴', color:'#ef4444', glow:'rgba(239,68,68,0.3)' },
    { key:'inProgress', label:'In Progress',  icon:'⚙️', color:'#f59e0b', glow:'rgba(245,158,11,0.3)' },
    { key:'resolved',   label:'Resolved',     icon:'✅', color:'#22c55e', glow:'rgba(34,197,94,0.3)' },
  ];

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div>
          <h1>Department Head Dashboard</h1>
          <p>🏛️ {user?.department}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {kpis?.critical > 0 && <span className="badge badge-red" style={{ boxShadow:'0 0 12px rgba(239,68,68,0.5)' }}>🚨 {kpis.critical} Critical</span>}
          <button className="btn btn-glass btn-sm" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid-4" style={{ marginBottom:'1.5rem' }}>
        {KPI.map((k,i) => (
          <div key={k.key} className="metric-card fade-up" style={{ animationDelay:`${i*0.08}s`, cursor:'pointer' }}
            onClick={() => setFilters(f => ({ ...f, status: k.key==='total'?'': k.key==='inProgress'?'in_progress':k.key }))}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow=`var(--s-md),0 0 20px ${k.glow}`; }}
            onMouseOut={e  => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div className="metric-card-glow" style={{ background:k.glow }} />
            <div style={{ display:'flex', justifyContent:'space-between' }}><div className="metric-label">{k.label}</div><span style={{ fontSize:22 }}>{k.icon}</span></div>
            <div className="metric-value" style={{ color:k.color, textShadow:`0 0 20px ${k.glow}` }}>{kpis ? (k.key==='inProgress' ? kpis.inProgress : kpis[k.key]) ?? 0 : '—'}</div>
            {kpis && k.key==='resolved' && <div className="metric-sub">{kpis.resolutionRate}% rate</div>}
          </div>
        ))}
      </div>

      {/* ── Field Officers panel ── */}
      <div className="card fade-up d1" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div className="section-label" style={{ margin:0 }}>👷 Field Officers ({officers.length})</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>➕ Add Officer</button>
        </div>

        {officers.length === 0 ? (
          <div style={{ textAlign:'center', padding:'1.5rem', color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>👷</div>
            <div style={{ fontSize:14, marginBottom:4 }}>No field officers yet</div>
            <div style={{ fontSize:12 }}>Add officers to your department to assign issues to them</div>
          </div>
        ) : (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {officers.map(o => (
              <div key={o._id} style={{ background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.18)', borderRadius:'var(--r-sm)', padding:'10px 14px', display:'flex', alignItems:'center', gap:10, minWidth:200 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {o.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.email}</div>
                  {o.phone && <div style={{ fontSize:11, color:'#06b6d4' }}>📱 {o.phone}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:2, minWidth:160, position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none' }}>🔍</span>
            <input className="form-control" style={{ paddingLeft:38 }} placeholder="Search by title or ticket…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width:140 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status:e.target.value }))}>
            <option value="">All Status</option>
            {['pending','assigned','in_progress','resolved'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <select className="form-control" style={{ width:140 }} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority:e.target.value }))}>
            <option value="">All Priority</option>
            {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(filters.status || filters.priority || search) && (
            <button className="btn btn-glass btn-sm" onClick={() => { setFilters({ status:'', priority:'' }); setSearch(''); }}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Issues list */}
      {busy ? [1,2,3].map(i => <SkeletonCard key={i} />) : sorted.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:48, marginBottom:14 }}>🎉</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-secondary)', fontFamily:'var(--f-display)' }}>No issues match filters</div>
        </div>
      ) : sorted.map(issue => {
        const color  = PRIO_COLOR[issue.priority] || '#6366f1';
        const images = (issue.images || []).map(getImageUrl).filter(Boolean);
        return (
          <div key={issue._id} className="card" style={{ marginBottom:'1rem', borderLeft:`3px solid ${color}`, boxShadow:`var(--s-sm),-2px 0 14px ${color}30` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>
                  {issue.ticketId}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--f-display)', lineHeight:1.3 }}>{issue.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>📍 {issue.location?.address}{issue.location?.area ? ` · ${issue.location.area}` : ''}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end', flexShrink:0 }}>
                <PriorityBadge priority={issue.priority} />
                <StatusBadge   status={issue.status} />
              </div>
            </div>

            {/* Tags */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)', textTransform:'capitalize' }}>📂 {issue.category}</span>
              <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>👤 {issue.reportedBy?.name}</span>
              <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>
              {issue.assignedTo && (
                <span style={{ background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.25)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'#06b6d4' }}>
                  👷 {issue.assignedTo?.name}
                </span>
              )}
            </div>

            {/* Photos */}
            {images.length > 0 && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                {images.map((src,i) => (
                  <div key={i} onClick={() => setPreview({ images, idx:i })}
                    style={{ width:75, height:58, borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', flexShrink:0 }}>
                    <img src={src} alt="evidence" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
                  </div>
                ))}
              </div>
            )}

            {/* Assign officer row */}
            {officers.length > 0 && !['resolved','closed'].includes(issue.status) && (
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10, background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.15)', borderRadius:'var(--r-sm)', padding:'10px 12px' }}>
                <span style={{ fontSize:12, color:'#06b6d4', fontWeight:600, fontFamily:'var(--f-display)', whiteSpace:'nowrap' }}>👷 Assign:</span>
                <select className="form-control" style={{ flex:1, padding:'7px 12px', fontSize:13 }}
                  value={assignMap[issue._id] || issue.assignedTo?._id || ''}
                  onChange={e => setAssignMap(m => ({ ...m, [issue._id]: e.target.value }))}>
                  <option value="">Select officer…</option>
                  {officers.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                </select>
                <button className="btn btn-sm"
                  disabled={!(assignMap[issue._id] || issue.assignedTo?._id)}
                  style={{ background:'rgba(6,182,212,0.15)', color:'#06b6d4', border:'1px solid rgba(6,182,212,0.3)', borderRadius:'var(--r-sm)', whiteSpace:'nowrap' }}
                  onClick={() => handleAssign(issue._id)}>
                  Assign →
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              {!['resolved','closed'].includes(issue.status) && (
                <button className="btn btn-sm"
                  style={{ background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'var(--r-sm)' }}
                  onClick={() => setResolving(issue)}>✅ Resolve</button>
              )}
              {issue.status === 'pending' && (
                <button className="btn btn-sm"
                  style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'var(--r-sm)' }}
                  onClick={() => handleStatus(issue._id, 'in_progress')}>⚙️ In Progress</button>
              )}
              <button className="btn btn-glass btn-sm" style={{ marginLeft:'auto' }} onClick={() => navigate(`/issues/${issue._id}`)}>View →</button>
            </div>
          </div>
        );
      })}

      {preview && <ImagePreviewModal images={preview.images} startIndex={preview.idx} onClose={() => setPreview(null)} />}
      {showCreate && <CreateOfficerModal department={user?.department} onClose={() => setShowCreate(false)} onCreated={o => setOfficers(prev => [...prev, o])} />}
      {resolving  && <ResolveModal issue={resolving} onClose={() => setResolving(null)} onResolved={id => { setIssues(prev => prev.map(i => i._id===id ? {...i, status:'resolved'} : i)); setResolving(null); }} />}
    </div>
  );
}