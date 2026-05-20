import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminIssues, getDeptStats, updateStatus, getImageUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Spinner, StatusBadge, PriorityBadge, SkeletonCard } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';

const PRIO_STYLE = {
  critical: { color:'#ef4444', glow:'rgba(239,68,68,0.35)', border:'rgba(239,68,68,0.3)' },
  high:     { color:'#f59e0b', glow:'rgba(245,158,11,0.3)',  border:'rgba(245,158,11,0.25)' },
  medium:   { color:'#06b6d4', glow:'rgba(6,182,212,0.25)', border:'rgba(6,182,212,0.2)' },
  low:      { color:'#22c55e', glow:'rgba(34,197,94,0.2)',  border:'rgba(34,197,94,0.2)' },
};

function IssueCard({ issue, onStatusChange }) {
  const [expanded,    setExpanded]    = useState(false);
  const [noteText,    setNoteText]    = useState('');
  const [showNote,    setShowNote]    = useState(false);
  const [busy,        setBusy]        = useState(false);
  const [previewIdx,  setPreviewIdx]  = useState(null);
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const prio       = PRIO_STYLE[issue.priority] || PRIO_STYLE.low;
  const images     = (issue.images || []).map(getImageUrl).filter(Boolean);

  const changeStatus = async (status, message) => {
    setBusy(true);
    try {
      await updateStatus(issue._id, { status, message: message || noteText || '' });
      toast(`✅ Marked as "${status.replace(/_/g,' ')}"`);
      onStatusChange(issue._id, status);
      setNoteText(''); setShowNote(false);
    } catch { toast('Failed to update','error'); }
    setBusy(false);
  };

  return (
    <>
      <div className="card" style={{ marginBottom:'1rem', borderLeft:`3px solid ${prio.color}`, boxShadow:`var(--s-sm), -2px 0 20px ${prio.glow}`, animation:'fadeUp 0.4s ease both' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>
              {issue.ticketId}
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--f-display)', lineHeight:1.3 }}>{issue.title}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
              📍 {issue.location?.address}{issue.location?.area ? ` · ${issue.location.area}` : ''}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end', flexShrink:0 }}>
            <PriorityBadge priority={issue.priority} />
            <StatusBadge status={issue.status} />
          </div>
        </div>

        {/* Meta tags */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)', textTransform:'capitalize' }}>
            📂 {issue.category}
          </span>
          <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>
            📅 {new Date(issue.createdAt).toLocaleDateString()}
          </span>
          <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>
            👤 {issue.reportedBy?.name}
          </span>
          {issue.isOverdue && <span className="badge badge-red">⚠ Overdue</span>}
        </div>

        {/* ── IMAGE THUMBNAILS ── */}
        {images.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
              📷 {images.length} Photo{images.length>1?'s':''}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {images.map((src, i) => (
                <div key={i} onClick={() => setPreviewIdx(i)}
                  style={{ width:90, height:70, borderRadius:10, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', position:'relative', flexShrink:0 }}
                  onMouseOver={e => e.currentTarget.querySelector('.img-overlay').style.opacity=1}
                  onMouseOut={e => e.currentTarget.querySelector('.img-overlay').style.opacity=0}>
                  <img src={src} alt={`evidence-${i}`}
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                  <div style={{ display:'none', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', background:'rgba(255,255,255,0.05)', fontSize:20, color:'var(--text-muted)' }}>🖼</div>
                  <div className="img-overlay" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}>
                    <span style={{ color:'#fff', fontSize:16 }}>🔍</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description (expanded) */}
        {expanded && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)', borderRadius:'var(--r-sm)', padding:'10px 14px', marginBottom:12, fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
            {issue.description}
          </div>
        )}

        {/* Note input */}
        {showNote && (
          <div style={{ marginBottom:10 }}>
            <textarea className="form-control" rows={2} placeholder="Add note to citizen…" value={noteText} onChange={e => setNoteText(e.target.value)} style={{ marginBottom:6 }} />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {issue.status === 'pending' && (
            <button className="btn btn-sm" disabled={busy} onClick={() => changeStatus('assigned','Issue assigned to our team.')}
              style={{ background:'rgba(6,182,212,0.15)', color:'#06b6d4', border:`1px solid rgba(6,182,212,0.3)`, borderRadius:'var(--r-sm)' }}>
              👷 Assign
            </button>
          )}
          {['pending','assigned'].includes(issue.status) && (
            <button className="btn btn-sm" disabled={busy} onClick={() => changeStatus('in_progress', noteText || 'Work has started.')}
              style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:`1px solid rgba(245,158,11,0.3)`, borderRadius:'var(--r-sm)' }}>
              ⚙️ In Progress
            </button>
          )}
          {!['resolved','closed'].includes(issue.status) && (
            <button className="btn btn-sm" disabled={busy} onClick={() => changeStatus('resolved', noteText || 'Issue resolved. Thank you for your patience.')}
              style={{ background:'rgba(34,197,94,0.15)', color:'#22c55e', border:`1px solid rgba(34,197,94,0.3)`, borderRadius:'var(--r-sm)', boxShadow:'0 0 12px rgba(34,197,94,0.15)' }}>
              ✅ Resolve
            </button>
          )}
          <button className="btn btn-glass btn-sm" onClick={() => setShowNote(n=>!n)}>📝 Note</button>
          {showNote && noteText && (
            <button className="btn btn-sm" disabled={busy} onClick={() => changeStatus(issue.status, noteText)}
              style={{ background:'rgba(99,102,241,0.15)', color:'#818cf8', border:`1px solid rgba(99,102,241,0.3)`, borderRadius:'var(--r-sm)' }}>
              Send
            </button>
          )}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={() => setExpanded(e=>!e)}>
            {expanded ? '▲ Less' : '▼ More'}
          </button>
          <button className="btn btn-glass btn-sm" onClick={() => navigate(`/issues/${issue._id}`)}>View →</button>
        </div>
      </div>

      {previewIdx !== null && images.length > 0 && (
        <ImagePreviewModal images={images} startIndex={previewIdx} onClose={() => setPreviewIdx(null)} />
      )}
    </>
  );
}

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
      const [issueRes, kpiRes] = await Promise.all([
        getAdminIssues({ ...filters, limit:50 }),
        getDeptStats(),
      ]);
      setIssues(issueRes.data.data || []);
      setKpis(kpiRes.data.kpis);
    } catch {}
    setBusy(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const onStatusChange = (id, status) => setIssues(prev => prev.map(i => i._id===id ? {...i,status} : i));

  const filtered = issues.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.ticketId?.includes(search.toUpperCase())
  );

  const KPI_CONFIG = [
    { key:'total',      label:'Total Assigned', icon:'📋', color:'#6366f1', glow:'rgba(99,102,241,0.3)' },
    { key:'pending',    label:'Pending',          icon:'🔴', color:'#ef4444', glow:'rgba(239,68,68,0.3)' },
    { key:'inProgress', label:'In Progress',      icon:'⚙️', color:'#f59e0b', glow:'rgba(245,158,11,0.3)' },
    { key:'resolved',   label:'Resolved',          icon:'✅', color:'#22c55e', glow:'rgba(34,197,94,0.3)' },
  ];

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div>
          <h1>Officer Dashboard</h1>
          <p>🏛️ {user?.department} · {kpis?.total || 0} issues assigned</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {kpis?.critical > 0 && (
            <span className="badge badge-red" style={{ boxShadow:'0 0 12px rgba(239,68,68,0.5)' }}>🚨 {kpis.critical} Critical</span>
          )}
          <button className="btn btn-glass btn-sm" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      {/* KPI Cards — Clickable */}
      <div className="grid-4" style={{ marginBottom:'1.5rem' }}>
        {KPI_CONFIG.map((k, i) => (
          <div key={k.key} className="metric-card fade-up" style={{ animationDelay:`${i*0.08}s`, cursor:'pointer' }}
            onClick={() => setFilters(f => ({ ...f, status: k.key==='total'?'':k.key==='inProgress'?'in_progress':k.key }))}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow=`var(--s-md), 0 0 20px ${k.glow}`; }}
            onMouseOut={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
            <div className="metric-card-glow" style={{ background:k.glow }} />
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <div className="metric-label">{k.label}</div>
              <span style={{ fontSize:22 }}>{k.icon}</span>
            </div>
            <div className="metric-value" style={{ color:k.color, textShadow:`0 0 20px ${k.glow}` }}>
              {kpis ? (k.key==='inProgress' ? kpis.inProgress : kpis[k.key]) ?? 0 : '—'}
            </div>
            {kpis && k.key==='resolved' && (
              <div className="metric-sub">{kpis.resolutionRate}% rate</div>
            )}
            <div style={{ fontSize:10, color:k.color, marginTop:6, opacity:0.6, fontFamily:'var(--f-display)', letterSpacing:'.05em' }}>CLICK TO FILTER →</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:2, minWidth:160, position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none' }}>🔍</span>
            <input className="form-control" style={{ paddingLeft:38 }} placeholder="Search by title or ticket ID…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width:140 }} value={filters.status} onChange={e => setFilters(f=>({...f,status:e.target.value}))}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select className="form-control" style={{ width:140 }} value={filters.priority} onChange={e => setFilters(f=>({...f,priority:e.target.value}))}>
            <option value="">All Priority</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          {(filters.status || filters.priority || search) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({status:'',priority:''}); setSearch(''); }}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Issues */}
      {busy ? (
        <>{[1,2,3].map(i => <SkeletonCard key={i} />)}</>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:48, marginBottom:14 }}>🎉</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-secondary)', fontFamily:'var(--f-display)' }}>No issues match your filters</div>
        </div>
      ) : (
        <div>
          {/* Critical first */}
          {filtered.filter(i => i.priority==='critical').map(i => <IssueCard key={i._id} issue={i} onStatusChange={onStatusChange} />)}
          {filtered.filter(i => i.priority!=='critical').map(i => <IssueCard key={i._id} issue={i} onStatusChange={onStatusChange} />)}
        </div>
      )}
    </div>
  );
}