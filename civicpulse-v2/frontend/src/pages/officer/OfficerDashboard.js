import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminIssues, getImageUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PriorityBadge, SkeletonCard } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import api from '../../api';

const PRIO = {
  critical:{ color:'#ef4444', glow:'rgba(239,68,68,0.35)' },
  high:    { color:'#f59e0b', glow:'rgba(245,158,11,0.3)' },
  medium:  { color:'#06b6d4', glow:'rgba(6,182,212,0.25)' },
  low:     { color:'#22c55e', glow:'rgba(34,197,94,0.2)' },
};

/* ── Resolve Modal — requires proof image upload ───────────────────────────── */
function ResolveModal({ issue, onClose, onResolved }) {
  const [note,    setNote]    = useState('Issue has been resolved. Thank you for reporting!');
  const [file,    setFile]    = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const fileRef = useRef(null);
  const { toast } = useToast();

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = e => setPreview(e.target.result);
    r.readAsDataURL(f);
  };

  const submit = async () => {
    if (!file) { setErr('Proof image is required to mark as resolved.'); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('status',     'resolved');
      fd.append('message',    note);
      fd.append('proofImage', file);
      await api.put(`/issues/${issue._id}/status`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      toast('✅ Issue resolved with proof!');
      onResolved(issue._id);
      onClose();
    } catch (e) { setErr(e.response?.data?.message || 'Failed to resolve'); }
    setBusy(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'1.75rem', width:'100%', maxWidth:460, boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontFamily:'var(--f-display)', fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>✅ Mark as Resolved</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{issue.title}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>⚠️ {err}</div>}

        <div style={{ marginBottom:'1rem' }}>
          <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
            📷 Proof Image <span style={{ color:'#ef4444' }}>*</span> (mandatory)
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ position:'absolute', width:1, height:1, opacity:0, pointerEvents:'none' }}
            onChange={e => pickFile(e.target.files[0])} />

          {preview ? (
            <div style={{ position:'relative', borderRadius:10, overflow:'hidden', border:'2px solid rgba(34,197,94,0.4)', marginBottom:8 }}>
              <img src={preview} alt="proof" style={{ width:'100%', height:180, objectFit:'cover', display:'block' }} />
              <button onClick={() => { setFile(null); setPreview(null); }}
                style={{ position:'absolute', top:8, right:8, background:'rgba(239,68,68,0.85)', border:'none', borderRadius:'50%', width:28, height:28, color:'#fff', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.6)', borderRadius:6, padding:'3px 10px', fontSize:11, color:'#4ade80', fontWeight:600 }}>✅ Proof attached</div>
            </div>
          ) : (
            <div onClick={() => { if(fileRef.current){ fileRef.current.value=''; fileRef.current.click(); } }}
              style={{ border:'2px dashed rgba(34,197,94,0.3)', borderRadius:10, padding:'2rem', textAlign:'center', cursor:'pointer', background:'rgba(34,197,94,0.04)', transition:'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor='rgba(34,197,94,0.6)'; e.currentTarget.style.background='rgba(34,197,94,0.08)'; }}
              onMouseOut={e  => { e.currentTarget.style.borderColor='rgba(34,197,94,0.3)'; e.currentTarget.style.background='rgba(34,197,94,0.04)'; }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', fontWeight:600 }}>Click to upload proof image</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Photo showing the issue has been fixed</div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Message to citizen</label>
          <textarea className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <button className="btn btn-glass" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2, background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 4px 16px rgba(34,197,94,0.4)' }} onClick={submit} disabled={busy || !file}>
            {busy ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Resolving…</> : '✅ Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Priority Selector (inline, used by officers/dept head) ─────────────────── */
function PrioritySelector({ issue, onPriorityChange }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const OPTS = [
    { value:'critical', label:'🔴 Critical', color:'#ef4444', bg:'rgba(239,68,68,0.12)', border:'rgba(239,68,68,0.35)' },
    { value:'high',     label:'🟠 High',     color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.35)' },
    { value:'medium',   label:'🟡 Medium',   color:'#06b6d4', bg:'rgba(6,182,212,0.12)',  border:'rgba(6,182,212,0.35)'  },
    { value:'low',      label:'🟢 Low',      color:'#22c55e', bg:'rgba(34,197,94,0.12)',  border:'rgba(34,197,94,0.35)'  },
  ];

  const change = async (val) => {
    if (val === issue.priority) return;
    setBusy(true);
    try {
      await api.patch(`/issues/${issue._id}`, { priority: val });
      toast(`⚡ Priority set to ${val}`);
      onPriorityChange(issue._id, val);
    } catch { toast('Failed to update priority', 'error'); }
    setBusy(false);
  };

  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>
        ⚡ Set Priority
      </div>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {OPTS.map(opt => (
          <button key={opt.value} disabled={busy}
            onClick={() => change(opt.value)}
            style={{
              padding:'3px 10px', fontSize:11, fontWeight:700, borderRadius:20, cursor:'pointer', border:`1px solid ${opt.border}`,
              background: issue.priority === opt.value ? opt.bg : 'transparent',
              color: issue.priority === opt.value ? opt.color : 'var(--text-muted)',
              boxShadow: issue.priority === opt.value ? `0 0 8px ${opt.border}` : 'none',
              transition:'all 0.18s', fontFamily:'var(--f-display)',
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Issue Card ─────────────────────────────────────────────────────────────── */
function IssueCard({ issue, onStatusChange, onPriorityChange }) {
  const [showNote,   setShowNote]   = useState(false);
  const [note,       setNote]       = useState('');
  const [busy,       setBusy]       = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [previewIdx, setPreviewIdx] = useState(null);
  const [resolveOpen,setResolveOpen]= useState(false);
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const prio       = PRIO[issue.priority] || PRIO.low;
  const images     = (issue.images || []).map(getImageUrl).filter(Boolean);
  const reporter   = issue.reportedBy;
  const officer    = issue.assignedTo;

  const changeStatus = async (status, message) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('status',  status);
      fd.append('message', message || note || '');
      await api.put(`/issues/${issue._id}/status`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      toast(`✅ ${status.replace(/_/g,' ')}`);
      onStatusChange(issue._id, status);
      setNote(''); setShowNote(false);
    } catch { toast('Failed','error'); }
    setBusy(false);
  };

  return (
    <>
      <div className="card" style={{ marginBottom:'1rem', borderLeft:`3px solid ${prio.color}`, boxShadow:`var(--s-sm),-2px 0 16px ${prio.glow}` }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>{issue.ticketId}</div>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--f-display)', lineHeight:1.3 }}>{issue.title}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>📍 {issue.location?.address}{issue.location?.area ? ` · ${issue.location.area}` : ''}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end', flexShrink:0 }}>
            <PriorityBadge priority={issue.priority} />
            <StatusBadge   status={issue.status} />
          </div>
        </div>

        {/* Citizen details */}
        {reporter && (
          <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:'var(--r-sm)', padding:'10px 14px', marginBottom:10 }}>
            <div style={{ fontSize:10, color:'#818cf8', fontFamily:'var(--f-display)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:7 }}>👤 Reported By</div>
            <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#fff', flexShrink:0 }}>
                {reporter.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{reporter.name}</div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:4 }}>
                  {reporter.email && <a href={`mailto:${reporter.email}`} style={{ fontSize:11, color:'#818cf8', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>✉️ {reporter.email}</a>}
                  {reporter.phone && <a href={`tel:${reporter.phone}`}   style={{ fontSize:11, color:'#34d399', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>📞 {reporter.phone}</a>}
                </div>
                {(reporter.area || reporter.ward) && (
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>📍 {[reporter.area, reporter.ward].filter(Boolean).join(' · ')}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assigned officer */}
        {officer && officer._id !== issue.reportedBy?._id && (
          <div style={{ background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.18)', borderRadius:'var(--r-sm)', padding:'10px 14px', marginBottom:10 }}>
            <div style={{ fontSize:10, color:'#06b6d4', fontFamily:'var(--f-display)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>👷 Assigned Officer</div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff', flexShrink:0 }}>
                {officer.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{officer.name}</div>
                <div style={{ display:'flex', gap:10, marginTop:3 }}>
                  {officer.email && <a href={`mailto:${officer.email}`} style={{ fontSize:11, color:'#818cf8', textDecoration:'none' }}>✉️ {officer.email}</a>}
                  {officer.phone && <a href={`tel:${officer.phone}`}   style={{ fontSize:11, color:'#34d399', textDecoration:'none' }}>📞 {officer.phone}</a>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
          <span style={{ background:'var(--badge-bg)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)', textTransform:'capitalize' }}>📂 {issue.category}</span>
          <span style={{ background:'var(--badge-bg)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>
          {issue.isOverdue && <span className="badge badge-red">⚠ Overdue</span>}
        </div>

        {/* Images */}
        {images.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>📷 {images.length} Photo{images.length>1?'s':''}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {images.map((src,i) => (
                <div key={i} onClick={() => setPreviewIdx(i)}
                  style={{ width:80, height:62, borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', flexShrink:0 }}>
                  <img src={src} alt="evidence" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
                </div>
              ))}
            </div>
          </div>
        )}

        {expanded && (
          <div style={{ background:'var(--hover-bg)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:'10px 14px', marginBottom:10, fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
            {issue.description}
          </div>
        )}

        {/* ← Priority selector for officer */}
        {!['resolved','closed'].includes(issue.status) && (
          <PrioritySelector issue={issue} onPriorityChange={onPriorityChange} />
        )}

        {showNote && (
          <div style={{ marginBottom:10 }}>
            <textarea className="form-control" rows={2} placeholder="Add a note to citizen…" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {['pending','assigned'].includes(issue.status) && (
            <button className="btn btn-sm" disabled={busy}
              onClick={() => changeStatus('in_progress','Work has started on this issue.')}
              style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'var(--r-sm)' }}>
              ⚙️ In Progress
            </button>
          )}
          {!['resolved','closed'].includes(issue.status) && (
            <button className="btn btn-sm"
              onClick={() => setResolveOpen(true)}
              style={{ background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'var(--r-sm)', boxShadow:'0 0 10px rgba(34,197,94,0.15)' }}>
              ✅ Resolve
            </button>
          )}
          <button className="btn btn-glass btn-sm" onClick={() => setShowNote(n => !n)}>📝 Note</button>
          {showNote && note && (
            <button className="btn btn-sm" disabled={busy}
              onClick={() => changeStatus(issue.status, note)}
              style={{ background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'var(--r-sm)' }}>Send</button>
          )}
          <button className="btn btn-glass btn-sm" onClick={() => setExpanded(e => !e)}>{expanded ? '▲ Less' : '▼ More'}</button>
          <button className="btn btn-glass btn-sm" style={{ marginLeft:'auto' }} onClick={() => navigate(`/issues/${issue._id}`)}>View →</button>
        </div>
      </div>

      {previewIdx !== null && images.length > 0 && (
        <ImagePreviewModal images={images} startIndex={previewIdx} onClose={() => setPreviewIdx(null)} />
      )}
      {resolveOpen && (
        <ResolveModal issue={issue} onClose={() => setResolveOpen(false)} onResolved={id => onStatusChange(id, 'resolved')} />
      )}
    </>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────────────────── */
export default function OfficerDashboard() {
  const { user }   = useAuth();
  const [issues,   setIssues]   = useState([]);
  const [kpis,     setKpis]     = useState(null);
  const [busy,     setBusy]     = useState(true);
  const [filters,  setFilters]  = useState({ status:'', priority:'' });
  const [search,   setSearch]   = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const iRes = await getAdminIssues({ assignedTo: user?._id, ...filters, limit:50 });
      const all  = iRes.data.data || [];
      setIssues(all);
      setKpis({
        total:          all.length,
        pending:        all.filter(i => i.status === 'pending').length,
        inProgress:     all.filter(i => ['assigned','in_progress'].includes(i.status)).length,
        resolved:       all.filter(i => i.status === 'resolved').length,
        resolutionRate: all.length > 0
          ? ((all.filter(i => i.status === 'resolved').length / all.length) * 100).toFixed(1)
          : '0.0',
      });
    } catch {}
    setBusy(false);
  }, [filters, user?._id]);

  useEffect(() => { load(); }, [load]);

  const onStatusChange   = (id, status)   => setIssues(prev => prev.map(i => i._id === id ? { ...i, status }   : i));
  const onPriorityChange = (id, priority) => setIssues(prev => prev.map(i => i._id === id ? { ...i, priority } : i));

  const filtered = issues.filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.ticketId?.includes(search.toUpperCase()));

  const KPI = [
    { key:'total',      label:'My Assigned', icon:'📋', color:'#6366f1', glow:'rgba(99,102,241,0.3)', filter:'' },
    { key:'pending',    label:'Pending',     icon:'🔴', color:'#ef4444', glow:'rgba(239,68,68,0.3)',  filter:'pending' },
    { key:'inProgress', label:'In Progress', icon:'⚙️', color:'#f59e0b', glow:'rgba(245,158,11,0.3)', filter:'in_progress' },
    { key:'resolved',   label:'Resolved',    icon:'✅', color:'#22c55e', glow:'rgba(34,197,94,0.3)',  filter:'resolved' },
  ];

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div>
          <h1>Officer Dashboard</h1>
          <p>🏛️ {user?.department} · {issues.length} issues assigned to you</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="btn btn-glass btn-sm" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid-4" style={{ marginBottom:'1.5rem' }}>
        {KPI.map((k, i) => (
          <div key={k.key} className="metric-card fade-up" style={{ animationDelay:`${i*0.08}s`, cursor:'pointer' }}
            onClick={() => setFilters(f => ({ ...f, status: k.filter }))}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow=`var(--s-md),0 0 20px ${k.glow}`; }}
            onMouseOut={e  => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div className="metric-card-glow" style={{ background:k.glow }} />
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <div className="metric-label">{k.label}</div>
              <span style={{ fontSize:22 }}>{k.icon}</span>
            </div>
            <div className="metric-value" style={{ color:k.color, textShadow:`0 0 20px ${k.glow}` }}>
              {kpis ? (k.key === 'inProgress' ? kpis.inProgress : kpis[k.key]) ?? 0 : '—'}
            </div>
            {kpis && k.key === 'resolved' && <div className="metric-sub">{kpis.resolutionRate}% rate</div>}
            <div style={{ fontSize:10, color:k.color, marginTop:6, opacity:0.6, fontFamily:'var(--f-display)', letterSpacing:'.05em' }}>CLICK TO FILTER →</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:2, minWidth:160, position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none' }}>🔍</span>
            <input className="form-control" style={{ paddingLeft:38 }} placeholder="Search by title or ticket ID…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width:140 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status:e.target.value }))}>
            <option value="">All Status</option>
            {['pending','assigned','in_progress','resolved'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          {/* ← Priority filter added */}
          <select className="form-control" style={{ width:140 }} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority:e.target.value }))}>
            <option value="">All Priority</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          {(filters.status || filters.priority || search) && (
            <button className="btn btn-glass btn-sm" onClick={() => { setFilters({ status:'', priority:'' }); setSearch(''); }}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Issue list */}
      {busy
        ? [1,2,3].map(i => <SkeletonCard key={i} />)
        : filtered.length === 0
          ? (
            <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
              <div style={{ fontSize:48, marginBottom:14 }}>🎉</div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-secondary)', fontFamily:'var(--f-display)' }}>No issues assigned to you</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:8 }}>Your department head will assign issues to you</div>
            </div>
          )
          : (
            <div>
              {filtered.filter(i => i.priority === 'critical').map(i => <IssueCard key={i._id} issue={i} onStatusChange={onStatusChange} onPriorityChange={onPriorityChange} />)}
              {filtered.filter(i => i.priority !== 'critical').map(i => <IssueCard key={i._id} issue={i} onStatusChange={onStatusChange} onPriorityChange={onPriorityChange} />)}
            </div>
          )
      }
    </div>
  );
}