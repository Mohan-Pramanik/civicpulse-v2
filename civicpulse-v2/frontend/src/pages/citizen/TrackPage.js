import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyIssues } from '../../api';
import { IssueProgress, StatusBadge, Spinner, EmptyState } from '../../components/common';

export default function TrackPage() {
  const [issues, setIssues] = useState([]);
  const [busy,   setBusy]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyIssues().then(r => setIssues(r.data.issues || [])).catch(() => {}).finally(() => setBusy(false));
  }, []);

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
          <EmptyState icon="📭" title="No reports yet" sub="You haven't reported any issues yet."
            action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>Report an Issue</button>} />
        </div>
      ) : issues.map((issue, i) => (
        <div key={issue._id} className="card fade-up" style={{ cursor:'pointer', animationDelay:`${i * 0.06}s`, marginBottom:'1rem' }}
          onClick={() => navigate(`/issues/${issue._id}`)}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, fontFamily:'var(--f-display)', background:'linear-gradient(135deg, #6366f1, #22c55e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:4 }}>
                {issue.ticketId}
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--f-display)' }}>{issue.title}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                📍 {issue.location?.address}{issue.location?.area ? ` · ${issue.location.area}` : ''}
              </div>
            </div>
            <StatusBadge status={issue.status} />
          </div>

          <IssueProgress status={issue.status} />

          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
            <span style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--glass-border)', borderRadius:20, padding:'3px 11px', fontSize:12, color:'var(--text-secondary)' }}>
              🏛️ {issue.department}
            </span>
            {issue.isOverdue && <span className="badge badge-red">⚠ Overdue</span>}
            <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>
              {new Date(issue.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
