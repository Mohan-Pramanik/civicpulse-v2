import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssue, addComment, rateIssue, getImageUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PriorityBadge, IssueProgress, Spinner } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import IssueMap from '../../components/common/IssueMap';
import api from '../../api';

const TL_COLOR = {
  pending:     '#94a3b8',
  assigned:    '#38bdf8',
  in_progress: '#fbbf24',
  resolved:    '#4ade80',
  closed:      '#6b7280',
  rejected:    '#f87171',
};
const PRIO_COLOR = { critical:'#ef4444', high:'#f59e0b', medium:'#06b6d4', low:'#22c55e' };

/* ── Resolve Modal — proof image required ──────────────────────────────────── */
function ResolveModal({ issueId, onClose, onResolved }) {
  const [note,    setNote]    = useState('Issue has been resolved. Thank you for reporting!');
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
    if (!file) { setErr('Proof image is required to mark as resolved.'); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('status',     'resolved');
      fd.append('message',    note);
      fd.append('proofImage', file);
      const r = await api.put(`/issues/${issueId}/status`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      toast('✅ Issue resolved with proof!');
      onResolved(r.data.issue);
      onClose();
    } catch (e) { setErr(e.response?.data?.message || 'Failed to resolve'); }
    setBusy(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'1.75rem', width:'100%', maxWidth:460, boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div style={{ fontFamily:'var(--f-display)', fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>✅ Mark as Resolved</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {err && <div className="alert alert-error" style={{ marginBottom:'1rem' }}>⚠️ {err}</div>}

        <div style={{ marginBottom:'1rem' }}>
          <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
            📷 Proof Image <span style={{ color:'#ef4444' }}>*</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ position:'absolute', width:1, height:1, opacity:0, pointerEvents:'none' }}
            onChange={e => pickFile(e.target.files[0])} />
          {preview ? (
            <div style={{ position:'relative', borderRadius:10, overflow:'hidden', border:'2px solid rgba(34,197,94,0.4)' }}>
              <img src={preview} alt="proof" style={{ width:'100%', height:180, objectFit:'cover', display:'block' }} />
              <button onClick={() => { setFile(null); setPreview(null); }}
                style={{ position:'absolute', top:8, right:8, background:'rgba(239,68,68,0.85)', border:'none', borderRadius:'50%', width:28, height:28, color:'#fff', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>✕</button>
              <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.6)', borderRadius:6, padding:'3px 10px', fontSize:11, color:'#4ade80', fontWeight:600 }}>✅ Proof attached</div>
            </div>
          ) : (
            <div onClick={() => { if(fileRef.current){ fileRef.current.value=''; fileRef.current.click(); } }}
              style={{ border:'2px dashed rgba(34,197,94,0.3)', borderRadius:10, padding:'2rem', textAlign:'center', cursor:'pointer', background:'rgba(34,197,94,0.04)', transition:'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor='rgba(34,197,94,0.6)'; e.currentTarget.style.background='rgba(34,197,94,0.08)'; }}
              onMouseOut={e  => { e.currentTarget.style.borderColor='rgba(34,197,94,0.3)'; e.currentTarget.style.background='rgba(34,197,94,0.04)'; }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>Upload proof of resolution</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Photo showing the issue has been fixed</div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Message to citizen</label>
          <textarea className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-glass" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2, background:'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow:'0 4px 16px rgba(34,197,94,0.4)' }}
            onClick={submit} disabled={busy || !file}>
            {busy ? <><span className="spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,.2)' }} /> Resolving…</> : '✅ Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function IssueDetailPage() {
  const { id }    = useParams();
  const { user }  = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();

  const [issue,       setIssue]       = useState(null);
  const [busy,        setBusy]        = useState(true);
  const [newStatus,   setNewStatus]   = useState('');
  const [statusMsg,   setStatusMsg]   = useState('');
  const [updating,    setUpdating]    = useState(false);
  const [comment,     setComment]     = useState('');
  const [commenting,  setCommenting]  = useState(false);
  const [rating,      setRating]      = useState(0);
  const [previewIdx,  setPreviewIdx]  = useState(null);
  const [resolveOpen, setResolveOpen] = useState(false);

  useEffect(() => {
    getIssue(id)
      .then(r => setIssue(r.data.issue))
      .catch(() => navigate('/'))
      .finally(() => setBusy(false));
  }, [id]);

  const handleStatus = async () => {
    if (!newStatus) return;
    if (newStatus === 'resolved') { setResolveOpen(true); return; }
    setUpdating(true);
    try {
      const fd = new FormData();
      fd.append('status',  newStatus);
      fd.append('message', statusMsg);
      const r = await api.put(`/issues/${id}/status`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      setIssue(r.data.issue); setNewStatus(''); setStatusMsg('');
      toast('Status updated ✓');
    } catch (e) { toast(e.response?.data?.message || 'Failed', 'error'); }
    setUpdating(false);
  };

  const handleComment = async e => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      const r = await addComment(id, { text:comment });
      setIssue(prev => ({ ...prev, comments:r.data.comments }));
      setComment(''); toast('Comment added ✓');
    } catch {}
    setCommenting(false);
  };

  const handleRate = async stars => {
    setRating(stars);
    try { await rateIssue(id, { rating:stars }); toast(`Thanks! ${stars}⭐`); } catch {}
  };

  if (busy) return <div className="page"><Spinner /></div>;
  if (!issue) return null;

  // True admin — sees everything, can update anything
  const isSuperAdmin = user?.role === 'admin';

  // Dept HEAD — can see/update issues belonging to their own department only
  const isDeptHead =
    user?.role === 'department' &&
    user?.isHead === true &&
    issue.department === user?.department;

  // Field OFFICER — can see/update only issues assigned specifically to them
  const isAssignedOfficer =
    user?.role === 'department' &&
    user?.isHead === false &&
    (issue.assignedTo?._id === user?._id || issue.assignedTo === user?._id);

  // Umbrella flag used for "show citizen details / officer panel" sections
  const isAdmin = isSuperAdmin || isDeptHead || isAssignedOfficer;

  // Controls whether the Update Status panel is visible
  const canUpdateStatus = isSuperAdmin || isDeptHead || isAssignedOfficer;

  const isOwner  = issue.reportedBy?._id === user?._id || issue.reportedBy === user?._id;
  const images   = (issue.images || []).map(getImageUrl).filter(Boolean);
  const reporter = issue.reportedBy;
  const officer  = issue.assignedTo;
  const issueLat = issue.location?.lat;
  const issueLng = issue.location?.lng;

  return (
    <div className="page page-narrow">
      <button className="btn btn-glass btn-sm fade-up" style={{ marginBottom:'1rem' }} onClick={() => navigate(-1)}>← Back</button>

      {/* ── Main card ── */}
      <div className="card fade-up d1" style={{ marginBottom:'1rem' }}>
        <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:8 }}>
          {issue.ticketId}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:12 }}>
          <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--f-display)', color:'var(--text-primary)', lineHeight:1.3 }}>{issue.title}</h1>
          <PriorityBadge priority={issue.priority} />
        </div>
        <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:16 }}>{issue.description}</p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          <StatusBadge status={issue.status} />
          <span style={{ background:'var(--badge-bg)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>🏛️ {issue.department}</span>
          <span style={{ background:'var(--badge-bg)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>📍 {issue.location?.address}</span>
          {issue.location?.area && <span style={{ background:'var(--badge-bg)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>🏘️ {issue.location.area}</span>}
          {issue.isOverdue && <span className="badge badge-red">⚠ Overdue</span>}
        </div>
        <IssueProgress status={issue.status} />
        <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-muted)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
          <span>Reported by <strong style={{ color:'var(--text-secondary)' }}>{reporter?.name}</strong> · {new Date(issue.createdAt).toLocaleString()}</span>
          <span>👁 {issue.viewCount} · ▲ {issue.upvoteCount}</span>
        </div>
      </div>

      {/* ── Citizen details (admin/officer view) ── */}
      {isAdmin && reporter && (
        <div className="card fade-up d1" style={{ marginBottom:'1rem', background:'rgba(99,102,241,0.05)', borderColor:'rgba(99,102,241,0.2)' }}>
          <div className="section-label">👤 Reported By — Citizen Details</div>
          <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#fff', flexShrink:0, boxShadow:'0 4px 16px rgba(99,102,241,0.4)' }}>
              {reporter.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)', marginBottom:6 }}>{reporter.name}</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {reporter.email && (
                  <a href={`mailto:${reporter.email}`} style={{ fontSize:13, color:'#818cf8', textDecoration:'none', display:'flex', alignItems:'center', gap:5, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'4px 12px' }}>
                    ✉️ {reporter.email}
                  </a>
                )}
                {reporter.phone && (
                  <a href={`tel:${reporter.phone}`} style={{ fontSize:13, color:'#34d399', textDecoration:'none', display:'flex', alignItems:'center', gap:5, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:20, padding:'4px 12px' }}>
                    📞 {reporter.phone}
                  </a>
                )}
                {reporter.area && <span style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>📍 {reporter.area}{reporter.ward ? ` · ${reporter.ward}` : ''}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assigned Officer card ── */}
      {officer && (
        <div className="card fade-up d2" style={{ marginBottom:'1rem', background:'rgba(6,182,212,0.05)', borderColor:'rgba(6,182,212,0.2)' }}>
          <div className="section-label">👷 Assigned Officer</div>
          <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#fff', flexShrink:0, boxShadow:'0 4px 16px rgba(6,182,212,0.4)' }}>
              {officer.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)', marginBottom:2 }}>{officer.name}</div>
              <div style={{ fontSize:12, color:'#06b6d4', marginBottom:6 }}>🏛️ {officer.department || issue.department}</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {officer.email && (
                  <a href={`mailto:${officer.email}`} style={{ fontSize:13, color:'#818cf8', textDecoration:'none', display:'flex', alignItems:'center', gap:5, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'4px 12px' }}>
                    ✉️ Email Officer
                  </a>
                )}
                {officer.phone && (
                  <a href={`tel:${officer.phone}`} style={{ fontSize:13, color:'#34d399', textDecoration:'none', display:'flex', alignItems:'center', gap:5, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:20, padding:'4px 12px' }}>
                    📞 Call Officer
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Map ── */}
      {issueLat && issueLng && (
        <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
          <div className="section-label">🗺️ Issue Location</div>
          <IssueMap lat={issueLat} lng={issueLng} title={issue.title} address={issue.location?.address} color={PRIO_COLOR[issue.priority] || '#6366f1'} height={240} />
        </div>
      )}

      {/* ── Photo Evidence ── */}
      {images.length > 0 && (
        <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
          <div className="section-label">📷 Photo Evidence ({images.length})</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {images.map((src, i) => (
              <div key={i} onClick={() => setPreviewIdx(i)}
                style={{ position:'relative', cursor:'pointer', borderRadius:12, overflow:'hidden', border:'1px solid var(--glass-border)', width:140, height:110, flexShrink:0 }}
                onMouseOver={e => e.currentTarget.querySelector('.ov').style.opacity=1}
                onMouseOut={e  => e.currentTarget.querySelector('.ov').style.opacity=0}>
                <img src={src} alt={`evidence-${i}`} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  onError={e => e.target.style.display='none'} />
                <div className="ov" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}>
                  <span style={{ color:'#fff', fontSize:22 }}>🔍</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Status Timeline ── */}
      <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
        <div className="section-label">📅 Status Timeline</div>
        <div className="timeline">
          {(issue.statusHistory || []).map((h, i) => {
            const proofUrl = h.proofImage ? getImageUrl(h.proofImage) : null;
            return (
              <div key={i} className="tl-item">
                <div className="tl-dot" style={{ background:TL_COLOR[h.status]||'#888', boxShadow:`0 0 10px ${TL_COLOR[h.status]||'#888'}60` }} />
                <div className="tl-title" style={{ textTransform:'capitalize' }}>{h.status?.replace(/_/g,' ')}</div>
                {h.message && <div className="tl-msg">{h.message}</div>}
                <div className="tl-time">{new Date(h.timestamp).toLocaleString()}{h.updatedBy?.name && ` · ${h.updatedBy.name}`}</div>
                {/* Proof image shown in timeline */}
                {proofUrl && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:10, color:'#4ade80', fontWeight:600, marginBottom:4 }}>📷 Resolution Proof</div>
                    <img src={proofUrl} alt="proof" onClick={() => setPreviewIdx(images.indexOf(proofUrl))}
                      style={{ width:120, height:80, objectFit:'cover', borderRadius:8, border:'1px solid rgba(34,197,94,0.3)', cursor:'pointer', display:'block' }}
                      onError={e => e.target.style.display='none'} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Comments ── */}
      <div className="card fade-up d3" style={{ marginBottom:'1rem' }}>
        <div className="section-label">💬 Comments ({(issue.comments||[]).filter(c=>c.isPublic).length})</div>
        {(issue.comments||[]).filter(c=>c.isPublic||isAdmin).map((c, i) => (
          <div key={i} style={{ paddingBottom:12, marginBottom:12, borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <strong style={{ fontSize:13, color:'var(--text-primary)' }}>{c.author?.name}</strong>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
            </div>
            <div style={{ fontSize:14, color:'var(--text-secondary)' }}>{c.text}</div>
          </div>
        ))}
        <form onSubmit={handleComment} style={{ display:'flex', gap:8, marginTop:10 }}>
          <input className="form-control" placeholder="Add a comment…" value={comment} onChange={e => setComment(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={commenting || !comment.trim()}>Post</button>
        </form>
      </div>

      {/* ── Rating (citizen, resolved only) ── */}
      {isOwner && issue.status === 'resolved' && !issue.satisfactionRating && (
        <div className="card fade-up d3" style={{ marginBottom:'1rem', textAlign:'center' }}>
          <div className="section-label">⭐ Rate Resolution</div>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>How satisfied are you with the resolution?</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => handleRate(s)}
                style={{ fontSize:30, background:'none', border:'none', cursor:'pointer', opacity:rating>=s?1:0.25, transition:'all 0.2s', filter:rating>=s?'drop-shadow(0 0 8px rgba(245,158,11,0.6))':'none', transform:rating>=s?'scale(1.2)':'scale(1)' }}>
                ⭐
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin / Officer status update ── */}
      {canUpdateStatus && (
        <div className="card fade-up d3">
          <div className="section-label">🛠️ Update Status</div>
          <div className="form-group">
            <select className="form-control" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="">Select new status…</option>
              {['assigned','in_progress','resolved','closed','rejected'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g,' ')}{s==='resolved'?' (requires proof image)':''}</option>
              ))}
            </select>
          </div>
          {newStatus && newStatus !== 'resolved' && (
            <div className="form-group">
              <textarea className="form-control" rows={2} placeholder="Message to citizen (optional)…" value={statusMsg} onChange={e => setStatusMsg(e.target.value)} />
            </div>
          )}
          {newStatus === 'resolved' && (
            <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:'var(--r-sm)', padding:'10px 14px', marginBottom:'1rem', fontSize:12, color:'#4ade80' }}>
              📷 Clicking "Update" will open the proof image upload screen.
            </div>
          )}
          <button className="btn btn-primary" onClick={handleStatus} disabled={updating || !newStatus}>
            {updating ? 'Updating…' : '✅ Update Status'}
          </button>
        </div>
      )}

      {previewIdx !== null && images.length > 0 && (
        <ImagePreviewModal images={images} startIndex={previewIdx} onClose={() => setPreviewIdx(null)} />
      )}
      {resolveOpen && (
        <ResolveModal issueId={id} onClose={() => setResolveOpen(false)} onResolved={updated => setIssue(updated)} />
      )}
    </div>
  );
}