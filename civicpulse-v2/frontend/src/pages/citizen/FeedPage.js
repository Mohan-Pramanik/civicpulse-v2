import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIssues } from '../../api';
import IssueCard from '../../components/issues/IssueCard';
import { Spinner, EmptyState } from '../../components/common';

const CATS = ['all','road','water','waste','electricity','encroachment','other'];
const STATUSES = ['','pending','assigned','in_progress','resolved'];

export default function FeedPage() {
  const [issues, setIssues] = useState([]);
  const [total,  setTotal]  = useState(0);
  const [cat,    setCat]    = useState('all');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [busy,   setBusy]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setBusy(true);
    const params = {};
    if (cat !== 'all') params.category = cat;
    if (status) params.status = status;
    if (search) params.search = search;
    getIssues(params)
      .then(r => { setIssues(r.data.data); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [cat, status, search]);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>Civic Issues</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
            Kolkata, West Bengal · {total} reports
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/report')}>+ Report Issue</button>
      </div>

      {/* Map placeholder */}
      <div className="map-box" style={{ marginBottom:'1.25rem' }}>
        📍 Map view — add your Google Maps API key to enable geo-map
      </div>

      {/* Search */}
      <div className="form-group">
        <input className="form-control" placeholder="🔍 Search issues by title or description…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category pills */}
      <div className="pills">
        {CATS.map(c => (
          <button key={c} className={`pill ${cat===c?'active':''}`} onClick={() => setCat(c)}>
            {c === 'all' ? 'All' : c.charAt(0).toUpperCase()+c.slice(1)}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>Status:</span>
        {STATUSES.map(s => (
          <button key={s} className={`pill ${status===s?'active':''}`} onClick={() => setStatus(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Issues list */}
      <div className="card">
        {busy ? <Spinner /> : issues.length === 0
          ? <EmptyState icon="🗺️" title="No issues found" sub="Try changing the filters above."
              action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>Report one now</button>} />
          : issues.map(i => <IssueCard key={i._id} issue={i} />)
        }
      </div>
    </div>
  );
}
