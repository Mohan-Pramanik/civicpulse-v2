import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyIssues, getImageUrl, verifyIssueResolved, reopenIssue } from '../../api';
import { useToast } from '../../context/ToastContext';
import { IssueProgress, StatusBadge, Spinner, EmptyState } from '../../components/common';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import OverdueBadge from '../../components/OverdueBadge';

export default function TrackPage() {
  const [issues,      setIssues]      = useState([]);
  const [busy,        setBusy]        = useState(true);
  const [previewImg,  setPreviewImg]  = useState(null);
  const [verifyBusy,  setVerifyBusy]  = useState(null); // holds issue._id being processed
  const [rejectModal, setRejectModal] = useState(null); // holds issue when reject modal open
  const [rejectReason,setRejectReason]= useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    getMyIssues()
      .then(r => setIssues(r.data.issues || []))
      .catch(() => {})
      .finally(() => setBusy(false));
  }, []);

  // Deadline time remaining helper
  const deadlineInfo = (issue) => {
    if (!issue.deadline) return null;
    if (['resolved','closed'].includes(issue.status)) return null;
    const now      = new Date();
    const deadline = new Date(issue.deadline);
    const diffMs   = deadline - now;
    if (diffMs <= 0) {
      const days = Math.floor(Math.abs(diffMs) / 86400000);
      return { overdue:true, days, compensation: days * 100 };
    }
    const days  = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    return { overdue:false, days, hours };
  };

  if (busy) return <div className="page"><Spinner /></div>;

  return (
    <div className="page page-narrow">
      <div className="page-header fade-up">
        <div>
          <h1>My Reports</h1>
          <p>{issues.length} issue{issues.length !== 1 ? 's' : ''} submitted by you</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>➕ New Report</button>
      </div>

      {issues.length === 0 ? (
        <div className="card fade-up d1">
          <EmptyState icon="📭" title="No reports yet" sub="You haven't submitted any issues yet."
            action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>Report an Issue</button>} />
        </div>
      ) : issues.map((issue, i) => {
        const images   = (issue.images || []).map(getImageUrl).filter(Boolean);
        const officer  = issue.assignedTo;
        const dl       = deadlineInfo(issue);

        return (
          <div key={issue._id} className="card fade-up" style={{ animationDelay:`${i * 0.06}s`, marginBottom:'1rem' }}>

            {/* Header */}
            <div style={{ cursor:'pointer' }} onClick={() => navigate(`/issues/${issue._id}`)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg,#6366f1,#22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>
                    {issue.ticketId}
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{issue.title}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                    📍 {issue.location?.address}{issue.location?.area ? ` · ${issue.location.area}` : ''}
                  </div>
                </div>
                <StatusBadge status={issue.status} />
                {issue.status === 'pending_verification' && (
                  <span style={{ fontSize:11, fontWeight:700, background:'rgba(6,182,212,0.15)', color:'#06b6d4', border:'1px solid rgba(6,182,212,0.3)', borderRadius:20, padding:'2px 10px' }}>
                    🔍 Awaiting confirmation
                  </span>
                )}
              </div>
              <IssueProgress status={issue.status} />
            </div>

            {/* ── Citizen Verification Action (inline on TrackPage) ── */}
            {issue.status === 'pending_verification' && (
              <div style={{ marginTop:12, background:'rgba(6,182,212,0.06)', border:'2px solid rgba(6,182,212,0.3)', borderRadius:'var(--r-sm)', padding:'14px 16px' }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:12 }}>
                  <span style={{ fontSize:24, lineHeight:1 }}>🔍</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>Is your issue fixed?</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>The officer uploaded proof and marked this resolved. Please confirm.</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button
                    className="btn btn-sm"
                    disabled={verifyBusy === issue._id}
                    style={{ flex:1, background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', color:'#fff', fontWeight:700 }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setVerifyBusy(issue._id);
                      try {
                        await verifyIssueResolved(issue._id);
                        toast('✅ Issue confirmed as resolved!');
                        setIssues(prev => prev.map(i => i._id === issue._id ? { ...i, status:'resolved' } : i));
                      } catch { toast('Failed to confirm', 'error'); }
                      setVerifyBusy(null);
                    }}>
                    {verifyBusy === issue._id ? '…' : "✅ Yes, it's fixed!"}
                  </button>
                  <button
                    className="btn btn-sm btn-glass"
                    disabled={verifyBusy === issue._id}
                    style={{ flex:1, border:'1px solid rgba(239,68,68,0.4)', color:'#ef4444', fontWeight:700 }}
                    onClick={(e) => { e.stopPropagation(); setRejectReason(''); setRejectModal(issue); }}>
                    ❌ Not fixed yet
                  </button>
                </div>
              </div>
            )}

            {/* ── Deadline & overdue info ─────────────────────── */}
            {dl && (
              <div style={{ marginTop:10, padding:'10px 14px', borderRadius:'var(--r-sm)', background: dl.overdue ? 'rgba(239,68,68,.06)' : 'rgba(99,102,241,.06)', border:`1px solid ${dl.overdue ? 'rgba(239,68,68,.2)' : 'rgba(99,102,241,.2)'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <OverdueBadge issue={issue} />
                    {!dl.overdue && (
                      <span style={{ fontSize:12, fontWeight:600, color: dl.days === 0 ? '#ef4444' : dl.days <= 1 ? '#f59e0b' : '#818cf8' }}>
                        ⏱ {dl.days > 0 ? `${dl.days}d ` : ''}{dl.hours}h remaining
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                      📅 Deadline: {new Date(issue.deadline).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Compensation suggestion for overdue issues */}
                  {dl.overdue && dl.compensation > 0 && (
                    <div style={{ background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', borderRadius:20, padding:'3px 12px', fontSize:11, fontWeight:700, color:'#f59e0b' }}>
                      💰 Suggested comp: ₹{dl.compensation.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Deadline progress bar */}
                {!dl.overdue && issue.createdAt && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ height:4, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{
                        height:   '100%',
                        width:    `${Math.min(Math.round(((new Date() - new Date(issue.createdAt)) / (new Date(issue.deadline) - new Date(issue.createdAt))) * 100), 100)}%`,
                        background: dl.days <= 1 ? '#ef4444' : dl.days <= 2 ? '#f59e0b' : '#6366f1',
                        borderRadius: 4,
                        transition: 'width .5s ease',
                      }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Assigned officer card ───────────────────────── */}
            {officer && (
              <div style={{ marginTop:10, background:'rgba(6,182,212,.06)', border:'1px solid rgba(6,182,212,.2)', borderRadius:'var(--r-sm)', padding:'10px 14px', display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#06b6d4,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0 }}>
                  {officer.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:'#06b6d4', fontFamily:'var(--f-display)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>👷 Assigned Officer</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{officer.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>🏛️ {officer.department || issue.department}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {officer.email && (
                    <a href={`mailto:${officer.email}`} onClick={e => e.stopPropagation()}
                      style={{ fontSize:12, color:'#818cf8', textDecoration:'none', background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.2)', borderRadius:20, padding:'3px 10px' }}>
                      ✉️ Email
                    </a>
                  )}
                  {officer.phone && (
                    <a href={`tel:${officer.phone}`} onClick={e => e.stopPropagation()}
                      style={{ fontSize:12, color:'#34d399', textDecoration:'none', background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', borderRadius:20, padding:'3px 10px' }}>
                      📞 Call
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Photos */}
            {images.length > 0 && (
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6, fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                  📷 {images.length} Photo{images.length > 1 ? 's' : ''}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {images.map((src, idx) => (
                    <div key={idx} onClick={() => setPreviewImg({ images, idx })}
                      style={{ width:80, height:60, borderRadius:8, overflow:'hidden', cursor:'pointer', border:'1px solid var(--glass-border)', flexShrink:0 }}>
                      <img src={src} alt="evidence" style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        onError={e => e.target.style.display = 'none'} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
              <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>
                🏛️ {issue.department}
              </span>
              <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>
                {new Date(issue.createdAt).toLocaleDateString()}
              </span>
              <button className="btn btn-glass btn-sm" onClick={() => navigate(`/issues/${issue._id}`)}>
                View Details →
              </button>
            </div>
          </div>
        );
      })}

      {previewImg && (
        <ImagePreviewModal images={previewImg.images} startIndex={previewImg.idx} onClose={() => setPreviewImg(null)} />
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectModal && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.78)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={() => setRejectModal(null)}>
          <div style={{ background:'var(--bg-card)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--r)', padding:'1.75rem', width:'100%', maxWidth:440, boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ fontFamily:'var(--f-display)', fontSize:18, fontWeight:800, color:'var(--text-primary)' }}>❌ Report Not Fixed</div>
              <button onClick={() => setRejectModal(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize:12, color:'#f87171', fontWeight:600, marginBottom:4 }}>{rejectModal.ticketId} — {rejectModal.title}</div>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:'1rem' }}>Tell the officer what is still wrong so they can come back and fix it properly.</p>
            <textarea className="form-control" rows={3}
              placeholder="e.g. The pothole is still there, only partially filled…"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              style={{ marginBottom:'1rem' }} />
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-glass" style={{ flex:1 }} onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={verifyBusy === rejectModal._id}
                style={{ flex:1, background:'linear-gradient(135deg,#ef4444,#dc2626)', border:'none' }}
                onClick={async () => {
                  setVerifyBusy(rejectModal._id);
                  try {
                    await reopenIssue(rejectModal._id, rejectReason || 'Not fixed yet');
                    toast('Issue reopened — officer will revisit.');
                    setIssues(prev => prev.map(i => i._id === rejectModal._id ? { ...i, status:'in_progress' } : i));
                    setRejectModal(null);
                  } catch { toast('Failed to reopen', 'error'); }
                  setVerifyBusy(null);
                }}>
                {verifyBusy === rejectModal._id ? 'Submitting…' : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
