import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminIssues, getDeptStats, getAdminUsers, getImageUrl } from '../../api';
import { useAuth }  from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Spinner, StatusBadge, PriorityBadge, SkeletonCard } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import AssignWithDeadline from '../../components/AssignWithDeadline';
import OverdueBadge       from '../../components/OverdueBadge';
import api from '../../api';

const PRIO = { critical:'#ef4444', high:'#f59e0b', medium:'#06b6d4', low:'#22c55e' };

/* ── Add Officer Modal ──────────────────────────────────────── */
function AddOfficerModal({ department, onClose, onAdded }) {
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const { toast } = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    const { name, email, phone, password } = form;
    if (!name.trim())     { setErr('Name is required.');           return; }
    if (!email.trim())    { setErr('Email is required.');          return; }
    if (!password.trim()) { setErr('Password is required.');       return; }
    if (password.length < 6) { setErr('Password must be ≥ 6 chars.'); return; }

    setBusy(true); setErr('');
    try {
      const res = await api.post('/auth/register', {
        name:       name.trim(),
        email:      email.trim().toLowerCase(),
        phone:      phone.trim(),
        password,
        role:       'department',
        department,
        isHead:     false,
      });
      const newOfficer = res.data.user || res.data.data || res.data;
      toast(`✅ Officer "${name}" added!`);
      onAdded(newOfficer);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to add officer.');
    }
    setBusy(false);
  };

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.78)',
               backdropFilter:'blur(10px)', display:'flex', alignItems:'center',
               justifyContent:'center', padding:'1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background:'var(--bg-card)', border:'1px solid var(--glass-border)',
                 borderRadius:'var(--r)', padding:'1.75rem', width:'100%', maxWidth:440,
                 boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div style={{ fontFamily:'var(--f-display)', fontSize:17, fontWeight:800, color:'var(--text-primary)' }}>
            👷 Add Field Officer
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom:'1rem', background:'rgba(6,182,212,.08)', border:'1px solid rgba(6,182,212,.2)',
                      borderRadius:'var(--r-sm)', padding:'8px 12px', fontSize:12,
                      color:'#06b6d4', fontWeight:600, fontFamily:'var(--f-display)' }}>
          🏛️ Department: {department}
        </div>

        {err && (
          <div className="alert alert-error" style={{ marginBottom:'1rem' }}>⚠️ {err}</div>
        )}

        <div className="form-group">
          <label className="form-label">Full Name <span style={{ color:'#ef4444' }}>*</span></label>
          <input className="form-control" placeholder="e.g. Rahul Sharma"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Email <span style={{ color:'#ef4444' }}>*</span></label>
          <input className="form-control" type="email" placeholder="officer@department.gov"
            value={form.email} onChange={e => set('email', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-control" type="tel" placeholder="+91 98765 43210"
            value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>

        <div className="form-group" style={{ marginBottom:'1.25rem' }}>
          <label className="form-label">Password <span style={{ color:'#ef4444' }}>*</span></label>
          <input className="form-control" type="password" placeholder="Min. 6 characters"
            value={form.password} onChange={e => set('password', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-glass" style={{ flex:1 }} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-primary" style={{ flex:2, background:'linear-gradient(135deg,#06b6d4,#6366f1)' }}
            onClick={submit} disabled={busy}
          >
            {busy
              ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Adding…</>
              : '👷 Add Officer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Resolve Modal ─────────────────────────────────────────── */
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
      toast(`✅ ${issue.ticketId} resolved!`);
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
          <div style={{ fontFamily:'var(--f-display)', fontSize:17, fontWeight:800, color:'var(--text-primary)' }}>✅ Resolve Issue</div>
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
            <div style={{ position:'relative', borderRadius:10, overflow:'hidden', border:'2px solid rgba(34,197,94,.4)' }}>
              <img src={preview} alt="proof" style={{ width:'100%', height:160, objectFit:'cover', display:'block' }} />
              <button onClick={() => { setFile(null); setPreview(null); }}
                style={{ position:'absolute', top:8, right:8, background:'rgba(239,68,68,.85)', border:'none', borderRadius:'50%', width:28, height:28, color:'#fff', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>✕</button>
              <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,.6)', borderRadius:6, padding:'3px 10px', fontSize:11, color:'#4ade80', fontWeight:600 }}>✅ Proof attached</div>
            </div>
          ) : (
            <div onClick={() => { if(fileRef.current){ fileRef.current.value=''; fileRef.current.click(); } }}
              style={{ border:'2px dashed rgba(34,197,94,.3)', borderRadius:10, padding:'1.5rem', textAlign:'center', cursor:'pointer', background:'rgba(34,197,94,.04)' }}>
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
          <button className="btn btn-primary" style={{ flex:2, background:'linear-gradient(135deg,#22c55e,#16a34a)' }}
            onClick={submit} disabled={busy || !file}>
            {busy ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Resolving…</> : '✅ Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Priority Selector ──────────────────────────────────────── */
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

/* ── Main Dashboard ─────────────────────────────────────────── */
export default function DepartmentHeadDashboard() {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();

  const [issues,      setIssues]      = useState([]);
  const [officers,    setOfficers]    = useState([]);
  const [kpis,        setKpis]        = useState(null);
  const [busy,        setBusy]        = useState(true);
  const [filters,     setFilters]     = useState({ status:'', priority:'' });
  const [search,      setSearch]      = useState('');
  const [preview,     setPreview]     = useState(null);
  const [resolving,   setResolving]   = useState(null);
  const [assignOpen,  setAssignOpen]  = useState(false);
  const [assignIssue, setAssignIssue] = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [iRes, kRes, uRes] = await Promise.all([
        getAdminIssues({ ...filters, limit:100 }),
        getDeptStats(),
        getAdminUsers({ role:'department' }),
      ]);
      setIssues(iRes.data.data || []);
      setKpis(kRes.data.kpis);
      setOfficers((uRes.data.data || []).filter(u =>
        u.department === user?.department && !u.isHead && u._id !== user?._id
      ));
    } catch {}
    setBusy(false);
  }, [filters, user]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (issueId, status) => {
    try {
      const fd = new FormData();
      fd.append('status',  status);
      fd.append('message', `Marked ${status.replace(/_/g,' ')} by dept head`);
      await api.put(`/issues/${issueId}/status`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      setIssues(prev => prev.map(i => i._id === issueId ? { ...i, status } : i));
      toast(`✅ ${status.replace(/_/g,' ')}`);
    } catch { toast('Failed', 'error'); }
  };

  const onPriorityChange = (id, priority) =>
    setIssues(prev => prev.map(i => i._id === id ? { ...i, priority } : i));

  const sorted = [...issues]
    .filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.ticketId?.includes(search.toUpperCase()))
    .sort((a,b) => ({ critical:0, high:1, medium:2, low:3 }[a.priority]||4) - ({ critical:0, high:1, medium:2, low:3 }[b.priority]||4));

  const overdueCount = issues.filter(i => {
    if (!i.deadline || ['resolved','closed','rejected'].includes(i.status)) return false;
    return new Date() > new Date(i.deadline);
  }).length;

  const KPI = [
    { key:'total',      label:'Total Issues',  icon:'📋', color:'#6366f1', glow:'rgba(99,102,241,0.3)' },
    { key:'pending',    label:'Pending',       icon:'🔴', color:'#ef4444', glow:'rgba(239,68,68,0.3)' },
    { key:'inProgress', label:'In Progress',   icon:'⚙️', color:'#f59e0b', glow:'rgba(245,158,11,0.3)' },
    { key:'resolved',   label:'Resolved',      icon:'✅', color:'#22c55e', glow:'rgba(34,197,94,0.3)' },
  ];

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div>
          <h1>Department Head Dashboard</h1>
          <p>🏛️ {user?.department}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {overdueCount > 0 && (
            <span className="badge badge-red" style={{ boxShadow:'0 0 12px rgba(239,68,68,.5)' }}>
              🔴 {overdueCount} Overdue
            </span>
          )}
          {kpis?.critical > 0 && (
            <span className="badge badge-red" style={{ boxShadow:'0 0 12px rgba(239,68,68,.5)' }}>
              🚨 {kpis.critical} Critical
            </span>
          )}
          <button className="btn btn-glass btn-sm" onClick={() => navigate('/officer/accountability')}>⚡ Accountability</button>
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
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <div className="metric-label">{k.label}</div>
              <span style={{ fontSize:22 }}>{k.icon}</span>
            </div>
            <div className="metric-value" style={{ color:k.color, textShadow:`0 0 20px ${k.glow}` }}>
              {kpis ? (k.key==='inProgress' ? kpis.inProgress : kpis[k.key]) ?? 0 : '—'}
            </div>
            {kpis && k.key==='resolved' && <div className="metric-sub">{kpis.resolutionRate}% rate</div>}
          </div>
        ))}
      </div>

      {/* Field Officers panel */}
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
            <input className="form-control" style={{ paddingLeft:38 }} placeholder="Search by title or ticket…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width:140 }} value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status:e.target.value }))}>
            <option value="">All Status</option>
            {['pending','assigned','in_progress','resolved'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          {/* ← Priority filter added */}
          <select className="form-control" style={{ width:140 }} value={filters.priority}
            onChange={e => setFilters(f => ({ ...f, priority:e.target.value }))}>
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

      {/* Issue cards */}
      {busy ? [1,2,3].map(i => <SkeletonCard key={i} />) : sorted.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
          <div style={{ fontSize:48, marginBottom:14 }}>🎉</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-secondary)', fontFamily:'var(--f-display)' }}>No issues match filters</div>
        </div>
      ) : sorted.map(issue => {
        const color  = PRIO[issue.priority] || '#6366f1';
        const images = (issue.images || []).map(getImageUrl).filter(Boolean);
        return (
          <div key={issue._id} className="card" style={{ marginBottom:'1rem', borderLeft:`3px solid ${color}`, boxShadow:`var(--s-sm),-2px 0 14px ${color}30` }}>

            {/* Title row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>
                  {issue.ticketId}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--f-display)', lineHeight:1.3 }}>{issue.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                  📍 {issue.location?.address}{issue.location?.area ? ` · ${issue.location.area}` : ''}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end', flexShrink:0 }}>
                <PriorityBadge priority={issue.priority} />
                <StatusBadge   status={issue.status} />
              </div>
            </div>

            {/* Overdue + deadline */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10, alignItems:'center' }}>
              <OverdueBadge issue={issue} />
              {issue.deadline && !['resolved','closed','rejected'].includes(issue.status) && (
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                  📅 Deadline: {new Date(issue.deadline).toLocaleDateString()}
                </span>
              )}
              {issue.penaltyPointsAdded > 0 && (
                <span style={{ fontSize:11, color:'#f59e0b', fontWeight:600 }}>
                  ⚠️ +{issue.penaltyPointsAdded} penalty pts issued
                </span>
              )}
            </div>

            {/* Tags — now includes assigned officer name prominently */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              <span style={{ background:'rgba(255,255,255,.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)', textTransform:'capitalize' }}>📂 {issue.category}</span>
              <span style={{ background:'rgba(255,255,255,.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>👤 {issue.reportedBy?.name}</span>
              <span style={{ background:'rgba(255,255,255,.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>

              {/* ← Assigned officer name shown beside the assign button area */}
              {issue.assignedTo ? (
                <span style={{ background:'rgba(6,182,212,.12)', border:'1px solid rgba(6,182,212,.3)', borderRadius:20, padding:'2px 12px', fontSize:12, color:'#06b6d4', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:18, height:18, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff', flexShrink:0 }}>
                    {issue.assignedTo?.name?.[0]?.toUpperCase()}
                  </span>
                  👷 {issue.assignedTo?.name || 'Assigned'} — Field Officer
                </span>
              ) : (
                <span style={{ background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'#f59e0b' }}>
                  ⏳ Unassigned
                </span>
              )}
            </div>

            {/* Photos */}
            {images.length > 0 && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                {images.map((src,i) => (
                  <div key={i} onClick={() => setPreview({ images, idx:i })}
                    style={{ width:75, height:58, borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', flexShrink:0 }}>
                    <img src={src} alt="ev" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
                  </div>
                ))}
              </div>
            )}

            {/* ← Priority selector for dept head */}
            {!['resolved','closed'].includes(issue.status) && (
              <PrioritySelector issue={issue} onPriorityChange={onPriorityChange} />
            )}

            {/* Assign with deadline — shows officer name after assignment */}
            {officers.length > 0 && !['resolved','closed'].includes(issue.status) && (
              <div style={{ marginBottom:10, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <button
                  className="btn btn-sm"
                  style={{ background:'rgba(6,182,212,.12)', color:'#06b6d4', border:'1px solid rgba(6,182,212,.3)', borderRadius:'var(--r-sm)', fontFamily:'var(--f-display)', fontWeight:700 }}
                  onClick={() => { setAssignIssue(issue); setAssignOpen(true); }}
                >
                  👷 {issue.assignedTo ? `Reassign (${issue.assignedTo.name})` : 'Assign with Deadline →'}
                </button>
                {/* ← Officer name confirmation badge shown inline after assignment */}
                {issue.assignedTo && (
                  <span style={{ fontSize:12, color:'#22c55e', display:'flex', alignItems:'center', gap:5, fontWeight:600 }}>
                    ✅ <strong>{issue.assignedTo.name}</strong> is assigned for this issue
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              {!['resolved','closed'].includes(issue.status) && (
                <button className="btn btn-sm"
                  style={{ background:'rgba(34,197,94,.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,.3)', borderRadius:'var(--r-sm)' }}
                  onClick={() => setResolving(issue)}>✅ Resolve</button>
              )}
              {issue.status === 'pending' && (
                <button className="btn btn-sm"
                  style={{ background:'rgba(245,158,11,.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,.3)', borderRadius:'var(--r-sm)' }}
                  onClick={() => handleStatus(issue._id, 'in_progress')}>⚙️ In Progress</button>
              )}
              <button className="btn btn-glass btn-sm" style={{ marginLeft:'auto' }}
                onClick={() => navigate(`/issues/${issue._id}`)}>View →</button>
            </div>
          </div>
        );
      })}

      {preview    && <ImagePreviewModal images={preview.images} startIndex={preview.idx} onClose={() => setPreview(null)} />}
      {resolving  && <ResolveModal issue={resolving} onClose={() => setResolving(null)} onResolved={id => { setIssues(prev => prev.map(i => i._id===id ? {...i,status:'resolved'} : i)); }} />}

      {assignOpen && assignIssue && (
        <AssignWithDeadline
          issue={assignIssue}
          officers={officers}
          onClose={() => { setAssignOpen(false); setAssignIssue(null); }}
          onAssigned={updated => {
            setIssues(prev => prev.map(i => i._id === updated._id ? updated : i));
            toast(`✅ ${updated.assignedTo?.name || 'Officer'} assigned with deadline!`);
          }}
        />
      )}

      {showCreate && (
        <AddOfficerModal
          department={user?.department}
          onClose={() => setShowCreate(false)}
          onAdded={newOfficer => {
            setOfficers(prev => [...prev, newOfficer]);
          }}
        />
      )}
    </div>
  );
}