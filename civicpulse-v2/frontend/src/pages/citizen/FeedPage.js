import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIssues } from '../../api';
import IssueCard from '../../components/issues/IssueCard';
import MapView from '../../components/common/MapView';
import { Spinner, EmptyState, SkeletonCard } from '../../components/common';

const CATS = [
  { key:'all', label:'All', icon:'🗺️' },
  { key:'road', label:'Road', icon:'🛣️' },
  { key:'water', label:'Water', icon:'💧' },
  { key:'waste', label:'Waste', icon:'🗑️' },
  { key:'electricity', label:'Electricity', icon:'⚡' },
  { key:'encroachment', label:'Encroachment', icon:'🏗️' },
  { key:'other', label:'Other', icon:'📋' },
];
const STATUSES = [
  { key:'', label:'All Status' },
  { key:'pending', label:'🔴 Pending' },
  { key:'assigned', label:'🔵 Assigned' },
  { key:'in_progress', label:'🟡 In Progress' },
  { key:'resolved', label:'🟢 Resolved' },
];

export default function FeedPage() {
  const [issues,  setIssues]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [cat,     setCat]     = useState('all');
  const [status,  setStatus]  = useState('');
  const [search,  setSearch]  = useState('');
  const [busy,    setBusy]    = useState(true);
  const [showMap, setShowMap] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setBusy(true);
    const params = {};
    if (cat !== 'all') params.category = cat;
    if (status) params.status = status;
    if (search) params.search = search;
    getIssues(params)
      .then(r => { setIssues(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => { setIssues([]); setTotal(0); })
      .finally(() => setBusy(false));
  }, [cat, status, search]);

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header fade-up">
        <div>
          <h1>Civic Issues</h1>
          <p>📍 Kolkata, West Bengal · {total} active reports</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${showMap ? 'btn-primary' : 'btn-glass'}`} onClick={() => setShowMap(m => !m)}>
            {showMap ? '📋 List View' : '🗺️ Map View'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>➕ Report Issue</button>
        </div>
      </div>

      {/* Map View */}
      {showMap && (
        <div className="card fade-up d1" style={{ marginBottom: '1.25rem' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>🗺️ Issue Map</div>
          <MapView height={420} />
        </div>
      )}

      {/* Search */}
      <div className="feed-search-wrap fade-up d1" style={{ marginBottom: '1rem' }}>
        <span className="feed-search-icon">🔍</span>
        <input className="feed-search" placeholder="Search by title, area or description…"
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="feed-search-clear" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Category pills */}
      <div className="pills fade-up d2">
        {CATS.map(c => (
          <button key={c.key} className={`pill ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Status pills */}
      <div className="pills fade-up d2">
        {STATUSES.map(s => (
          <button key={s.key} className={`pill ${status === s.key ? 'active' : ''}`} onClick={() => setStatus(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Issues */}
      <div className="card fade-up d3">
        {busy
          ? [1,2,3].map(i => <SkeletonCard key={i} />)
          : issues.length === 0
            ? <EmptyState icon="🗺️" title="No issues found" sub="Try changing the filters or be the first to report!"
                action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>Report an issue</button>} />
            : issues.map(i => <IssueCard key={i._id} issue={i} />)
        }
      </div>
    </div>
  );
}