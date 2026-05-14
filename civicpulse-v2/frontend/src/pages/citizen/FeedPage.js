import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIssues } from '../../api';
import IssueCard from '../../components/issues/IssueCard';
import { Spinner, EmptyState } from '../../components/common';

const CATS = [
  { key: 'all', label: 'All', icon: '🗺️' },
  { key: 'road', label: 'Road', icon: '🛣️' },
  { key: 'water', label: 'Water', icon: '💧' },
  { key: 'waste', label: 'Waste', icon: '🗑️' },
  { key: 'electricity', label: 'Electricity', icon: '⚡' },
  { key: 'encroachment', label: 'Encroachment', icon: '🏗️' },
  { key: 'other', label: 'Other', icon: '📋' },
];
const STATUSES = [
  { key: '', label: 'All Status' },
  { key: 'pending', label: '🔴 Pending' },
  { key: 'assigned', label: '🔵 Assigned' },
  { key: 'in_progress', label: '🟡 In Progress' },
  { key: 'resolved', label: '🟢 Resolved' },
];

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
      .then(r => { setIssues(r.data.data || []); setTotal(r.data.total || 0); })
      .catch(() => { setIssues([]); setTotal(0); })
      .finally(() => setBusy(false));
  }, [cat, status, search]);

  return (
    <div className="page">
      <div className="feed-header animate-fade-up">
        <div>
          <h1 className="feed-title">Civic Issues</h1>
          <p className="feed-sub">📍 Kolkata, West Bengal &nbsp;·&nbsp; {total} reports</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/report')}>
          ➕ Report Issue
        </button>
      </div>

      <div className="map-box animate-fade-up delay-1" style={{ marginBottom: '1.25rem' }}>
        📍 Map view — add Google Maps API key to enable
      </div>

      <div className="feed-search-wrap animate-fade-up delay-1">
        <span className="feed-search-icon">🔍</span>
        <input
          className="feed-search"
          placeholder="Search issues by title or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="feed-search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      <div className="pills animate-fade-up delay-2" style={{ marginTop: '1rem' }}>
        {CATS.map(c => (
          <button key={c.key} className={`pill ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="pills animate-fade-up delay-2">
        {STATUSES.map(s => (
          <button key={s.key} className={`pill ${status === s.key ? 'active' : ''}`} onClick={() => setStatus(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="card animate-fade-up delay-3">
        {busy ? <Spinner /> : issues.length === 0
          ? <EmptyState icon="🗺️" title="No issues found" sub="Try changing the filters or be the first to report!"
              action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>Report an issue</button>} />
          : issues.map(i => <IssueCard key={i._id} issue={i} />)
        }
      </div>
    </div>
  );
}