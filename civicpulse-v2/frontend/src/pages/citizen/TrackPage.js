import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyIssues } from '../../api';
import { IssueProgress, StatusBadge, Spinner, EmptyState } from '../../components/common';

export default function TrackPage() {
  const [issues, setIssues] = useState([]);
  const [busy,   setBusy]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyIssues().then(r => setIssues(r.data.issues)).catch(()=>{}).finally(()=>setBusy(false));
  }, []);

  if (busy) return <div className="page"><Spinner /></div>;

  return (
    <div className="page page-narrow">
      <h1 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>My Reports</h1>
      <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:'1.5rem' }}>
        {issues.length} issue{issues.length!==1?'s':''} submitted by you
      </p>

      {issues.length === 0 ? (
        <div className="card">
          <EmptyState icon="📭" title="No reports yet" sub="You haven't reported any issues."
            action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>Report an Issue</button>} />
        </div>
      ) : issues.map(issue => (
        <div key={issue._id} className="card" style={{ cursor:'pointer' }} onClick={() => navigate(`/issues/${issue._id}`)}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, color:'var(--green)', fontWeight:600, marginBottom:3 }}>{issue.ticketId}</div>
              <div style={{ fontSize:15, fontWeight:600 }}>{issue.title}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                📍 {issue.location?.address} {issue.location?.area && `· ${issue.location.area}`}
              </div>
            </div>
            <StatusBadge status={issue.status} />
          </div>

          <IssueProgress status={issue.status} />

          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
            <span style={{ background:'var(--bg)', borderRadius:20, padding:'2px 9px', fontSize:12, color:'var(--text-secondary)' }}>
              {issue.department}
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
