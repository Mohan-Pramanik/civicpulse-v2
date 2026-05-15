import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIssue, updateStatus, addComment, rateIssue } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, PriorityBadge, IssueProgress, Spinner } from '../../components/common';

const TL_COLOR = { pending:'#94a3b8', assigned:'#38bdf8', in_progress:'#fbbf24', resolved:'#4ade80', closed:'#6b7280', rejected:'#f87171' };

export default function IssueDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();
  const [issue,     setIssue]     = useState(null);
  const [busy,      setBusy]      = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [updating,  setUpdating]  = useState(false);
  const [comment,   setComment]   = useState('');
  const [commenting,setCommenting]= useState(false);
  const [rating,    setRating]    = useState(0);

  useEffect(() => {
    getIssue(id).then(r => setIssue(r.data.issue)).catch(() => navigate('/')).finally(() => setBusy(false));
  }, [id]);

  const handleStatus = async () => {
    if (!newStatus) return;
    setUpdating(true);
    try {
      const r = await updateStatus(id, { status: newStatus, message: statusMsg });
      setIssue(r.data.issue); setNewStatus(''); setStatusMsg('');
      toast('Status updated ✓');
    } catch { toast('Failed to update status', 'error'); }
    setUpdating(false);
  };

  const handleComment = async e => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      const r = await addComment(id, { text: comment });
      setIssue(prev => ({ ...prev, comments: r.data.comments }));
      setComment(''); toast('Comment added ✓');
    } catch {}
    setCommenting(false);
  };

  const handleRate = async stars => {
    setRating(stars);
    try { await rateIssue(id, { rating: stars }); toast(`Thanks! ${stars}⭐`); } catch {}
  };

  if (busy) return <div className="page"><Spinner /></div>;
  if (!issue) return null;

  const isAdmin = user?.role === 'admin' || user?.role === 'department';
  const isOwner = issue.reportedBy?._id === user?._id || issue.reportedBy === user?._id;

  return (
    <div className="page page-narrow">
      <button className="btn btn-glass btn-sm fade-up" style={{ marginBottom:'1rem' }} onClick={() => navigate(-1)}>← Back</button>

      {/* Main card */}
      <div className="card fade-up d1" style={{ marginBottom:'1rem' }}>
        <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg, #6366f1, #22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:8 }}>
          {issue.ticketId}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <h1 style={{ fontSize:20, fontWeight:800, fontFamily:'var(--f-display)', color:'var(--text-primary)', lineHeight:1.3 }}>{issue.title}</h1>
          <PriorityBadge priority={issue.priority} />
        </div>
        <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:16 }}>{issue.description}</p>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
          <StatusBadge status={issue.status} />
          <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>🏛️ {issue.department}</span>
          <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>📍 {issue.location?.address}</span>
          {issue.location?.landmark && <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>🏛️ Near {issue.location.landmark}</span>}
          {issue.isOverdue && <span className="badge badge-red">⚠ Overdue</span>}
        </div>

        <IssueProgress status={issue.status} />

        <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-muted)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
          <span>Reported by <strong style={{ color:'var(--text-secondary)' }}>{issue.reportedBy?.name}</strong> · {new Date(issue.createdAt).toLocaleString()}</span>
          <span>👁 {issue.viewCount} views · ▲ {issue.upvoteCount} upvotes</span>
        </div>
      </div>

      {/* Images */}
      {issue.images?.length > 0 && (
        <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
          <div className="section-label">📷 Photo Evidence</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {issue.images.map((img, i) => (
              <img key={i} src={`${process.env.REACT_APP_API_URL?.replace('/api','')}${img}`} alt="evidence"
                style={{ width:'calc(33% - 6px)', minWidth:100, height:100, objectFit:'cover', borderRadius:10, border:'1px solid var(--glass-border)' }} />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card fade-up d2" style={{ marginBottom:'1rem' }}>
        <div className="section-label">📅 Status Timeline</div>
        <div className="timeline">
          {issue.statusHistory?.map((h, i) => (
            <div key={i} className="tl-item">
              <div className="tl-dot" style={{ background: TL_COLOR[h.status] || '#888', boxShadow: `0 0 10px ${TL_COLOR[h.status] || '#888'}60` }} />
              <div className="tl-title">{h.status?.replace(/_/g,' ')}</div>
              {h.message && <div className="tl-msg">{h.message}</div>}
              <div className="tl-time">{new Date(h.timestamp).toLocaleString()}{h.updatedBy?.name && ` · ${h.updatedBy.name}`}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="card fade-up d3" style={{ marginBottom:'1rem' }}>
        <div className="section-label">💬 Comments ({issue.comments?.filter(c => c.isPublic).length || 0})</div>
        {issue.comments?.filter(c => c.isPublic || isAdmin).map((c, i) => (
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

      {/* Rating */}
      {isOwner && issue.status === 'resolved' && !issue.satisfactionRating && (
        <div className="card fade-up d3" style={{ marginBottom:'1rem', textAlign:'center' }}>
          <div className="section-label">⭐ Rate Resolution</div>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:14 }}>How satisfied are you with how this issue was resolved?</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => handleRate(s)} style={{ fontSize:28, background:'none', border:'none', cursor:'pointer', opacity: rating >= s ? 1 : 0.25, transition:'all 0.2s', filter: rating >= s ? 'drop-shadow(0 0 8px rgba(245,158,11,0.6))' : 'none', transform: rating >= s ? 'scale(1.2)' : 'scale(1)' }}>⭐</button>
            ))}
          </div>
        </div>
      )}

      {/* Admin: update status */}
      {isAdmin && (
        <div className="card fade-up d3">
          <div className="section-label">🛠️ Update Status</div>
          <div className="form-group">
            <select className="form-control" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="">Select new status…</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="form-group">
            <textarea className="form-control" rows={2} placeholder="Message to citizen (optional)…" value={statusMsg} onChange={e => setStatusMsg(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleStatus} disabled={updating || !newStatus}>
            {updating ? 'Updating…' : '✅ Update Status'}
          </button>
        </div>
      )}
    </div>
  );
}
