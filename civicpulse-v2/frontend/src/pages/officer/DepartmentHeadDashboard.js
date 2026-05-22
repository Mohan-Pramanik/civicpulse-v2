import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminIssues, getDeptStats, updateStatus, getAdminUsers, getImageUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Spinner, StatusBadge, PriorityBadge, SkeletonCard } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';

export default function DepartmentHeadDashboard() {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [issues,   setIssues]   = useState([]);
  const [officers, setOfficers] = useState([]);
  const [kpis,     setKpis]     = useState(null);
  const [busy,     setBusy]     = useState(true);
  const [filters,  setFilters]  = useState({ status:'', priority:'' });
  const [search,   setSearch]   = useState('');
  const [assignMap,setAssignMap]= useState({});
  const [preview,  setPreview]  = useState(null);

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
      setOfficers((uRes.data.data||[]).filter(u => u.department===user?.department && !u.isHead && u._id!==user?._id));
    } catch {}
    setBusy(false);
  }, [filters, user]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (issueId) => {
    const officerId = assignMap[issueId];
    if (!officerId) return toast('Select an officer first','error');
    try {
      await updateStatus(issueId, { status:'assigned', message:`Assigned by department head ${user?.name}` });
      setIssues(prev => prev.map(i => i._id===issueId ? {...i,status:'assigned'} : i));
      toast('✅ Issue assigned to officer');
    } catch { toast('Assignment failed','error'); }
  };

  const handleStatus = async (issueId, status) => {
    try {
      await updateStatus(issueId, { status, message:`Marked ${status.replace(/_/g,' ')} by dept head` });
      setIssues(prev => prev.map(i => i._id===issueId ? {...i,status} : i));
      toast(`✅ ${status.replace(/_/g,' ')}`);
    } catch { toast('Failed','error'); }
  };

  const filtered = issues.filter(i =>
    (!search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.ticketId?.includes(search.toUpperCase()))
  );

  const sorted = [...filtered].sort((a,b) => {
    const o = { critical:0, high:1, medium:2, low:3 };
    return (o[a.priority]||4) - (o[b.priority]||4);
  });

  const KPI = [
    { key:'total', label:'Total Issues', icon:'📋', color:'#6366f1', glow:'rgba(99,102,241,0.3)' },
    { key:'pending', label:'Pending', icon:'🔴', color:'#ef4444', glow:'rgba(239,68,68,0.3)' },
    { key:'inProgress', label:'In Progress', icon:'⚙️', color:'#f59e0b', glow:'rgba(245,158,11,0.3)' },
    { key:'resolved', label:'Resolved', icon:'✅', color:'#22c55e', glow:'rgba(34,197,94,0.3)' },
  ];

  return (
    <div className="page">
      <div className="page-header fade-up">
        <div><h1>Department Head Dashboard</h1><p>🏛️ {user?.department}</p></div>
        <div style={{ display:'flex', gap:8 }}>
          {kpis?.critical>0 && <span className="badge badge-red" style={{ boxShadow:'0 0 12px rgba(239,68,68,0.5)' }}>🚨 {kpis.critical} Critical</span>}
          <button className="btn btn-glass btn-sm" onClick={load}>🔄 Refresh</button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom:'1.5rem' }}>
        {KPI.map((k,i) => (
          <div key={k.key} className="metric-card fade-up" style={{ animationDelay:`${i*0.08}s`, cursor:'pointer' }}
            onClick={() => setFilters(f=>({...f,status:k.key==='total'?'':k.key==='inProgress'?'in_progress':k.key}))}
            onMouseOver={e=>{e.currentTarget.style.transform='translateY(-5px)';e.currentTarget.style.boxShadow=`var(--s-md),0 0 20px ${k.glow}`;}}
            onMouseOut={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
            <div className="metric-card-glow" style={{ background:k.glow }} />
            <div style={{ display:'flex', justifyContent:'space-between' }}><div className="metric-label">{k.label}</div><span style={{ fontSize:22 }}>{k.icon}</span></div>
            <div className="metric-value" style={{ color:k.color, textShadow:`0 0 20px ${k.glow}` }}>{kpis?(k.key==='inProgress'?kpis.inProgress:kpis[k.key])??0:'—'}</div>
            {kpis&&k.key==='resolved'&&<div className="metric-sub">{kpis.resolutionRate}% rate</div>}
            <div style={{ fontSize:10, color:k.color, marginTop:6, opacity:0.6, fontFamily:'var(--f-display)', letterSpacing:'.05em' }}>CLICK TO FILTER →</div>
          </div>
        ))}
      </div>

      {officers.length > 0 && (
        <div className="card fade-up d1" style={{ marginBottom:'1rem' }}>
          <div className="section-label">👷 Field Officers ({officers.length})</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {officers.map(o => (
              <div key={o._id} style={{ background:'rgba(6,182,212,0.08)', border:'1px solid rgba(6,182,212,0.2)', borderRadius:'var(--r-sm)', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>{o.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{o.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{o.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:2, minWidth:160, position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none' }}>🔍</span>
            <input className="form-control" style={{ paddingLeft:38 }} placeholder="Search by title or ticket…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width:140 }} value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
            <option value="">All Status</option>
            {['pending','assigned','in_progress','resolved'].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-control" style={{ width:140 }} value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}>
            <option value="">All Priority</option>
            {['critical','high','medium','low'].map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          {(filters.status||filters.priority||search)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setFilters({status:'',priority:''});setSearch('');}}>✕</button>}
        </div>
      </div>

      {busy ? [1,2,3].map(i=><SkeletonCard key={i}/>) : sorted.length===0
        ? <div className="card" style={{ textAlign:'center', padding:'3rem' }}><div style={{ fontSize:48, marginBottom:14 }}>🎉</div><div style={{ fontSize:16, fontWeight:700, color:'var(--text-secondary)', fontFamily:'var(--f-display)' }}>No issues match filters</div></div>
        : sorted.map(issue => {
          const prio   = { critical:'#ef4444', high:'#f59e0b', medium:'#06b6d4', low:'#22c55e' };
          const images = (issue.images||[]).map(getImageUrl).filter(Boolean);
          return (
            <div key={issue._id} className="card" style={{ marginBottom:'1rem', borderLeft:`3px solid ${prio[issue.priority]||'#6366f1'}`, boxShadow:`var(--s-sm),-2px 0 14px ${prio[issue.priority]||'#6366f1'}30`, animation:'fadeUp 0.4s ease both' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>{issue.ticketId}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--f-display)', lineHeight:1.3 }}>{issue.title}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>📍 {issue.location?.address}{issue.location?.area?` · ${issue.location.area}`:''}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end', flexShrink:0 }}>
                  <PriorityBadge priority={issue.priority}/>
                  <StatusBadge status={issue.status}/>
                </div>
              </div>

              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)', textTransform:'capitalize' }}>📂 {issue.category}</span>
                <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>👤 {issue.reportedBy?.name}</span>
                <span style={{ background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'var(--text-secondary)' }}>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>
                {issue.assignedTo&&<span style={{ background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.25)', borderRadius:20, padding:'2px 10px', fontSize:12, color:'#06b6d4' }}>👷 {issue.assignedTo?.name||'Assigned'}</span>}
              </div>

              {images.length > 0 && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                  {images.map((src,i) => (
                    <div key={i} onClick={()=>setPreview({images,idx:i})}
                      style={{ width:75, height:58, borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', position:'relative', flexShrink:0 }}
                      onMouseOver={e=>e.currentTarget.querySelector('.ov').style.opacity=1}
                      onMouseOut={e=>e.currentTarget.querySelector('.ov').style.opacity=0}>
                      <img src={src} alt="ev" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
                      <div className="ov" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}><span style={{ color:'#fff', fontSize:13 }}>🔍</span></div>
                    </div>
                  ))}
                </div>
              )}

              {officers.length>0 && !['resolved','closed'].includes(issue.status) && (
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10, background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.15)', borderRadius:'var(--r-sm)', padding:'10px 12px' }}>
                  <span style={{ fontSize:12, color:'#06b6d4', fontWeight:600, fontFamily:'var(--f-display)', whiteSpace:'nowrap' }}>👷 Assign to:</span>
                  <select className="form-control" style={{ flex:1, padding:'7px 12px', fontSize:13 }} value={assignMap[issue._id]||''} onChange={e=>setAssignMap(m=>({...m,[issue._id]:e.target.value}))}>
                    <option value="">Select officer…</option>
                    {officers.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}
                  </select>
                  <button className="btn btn-sm" disabled={!assignMap[issue._id]} style={{ background:'rgba(6,182,212,0.15)', color:'#06b6d4', border:'1px solid rgba(6,182,212,0.3)', borderRadius:'var(--r-sm)', whiteSpace:'nowrap' }} onClick={()=>handleAssign(issue._id)}>Assign →</button>
                </div>
              )}

              <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                {!['resolved','closed'].includes(issue.status)&&<button className="btn btn-sm" style={{ background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'var(--r-sm)' }} onClick={()=>handleStatus(issue._id,'resolved')}>✅ Resolve</button>}
                {issue.status==='pending'&&<button className="btn btn-sm" style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'var(--r-sm)' }} onClick={()=>handleStatus(issue._id,'in_progress')}>⚙️ In Progress</button>}
                <button className="btn btn-glass btn-sm" style={{ marginLeft:'auto' }} onClick={()=>navigate(`/issues/${issue._id}`)}>View →</button>
              </div>
            </div>
          );
        })
      }
      {preview&&<ImagePreviewModal images={preview.images} startIndex={preview.idx} onClose={()=>setPreview(null)}/>}
    </div>
  );
}