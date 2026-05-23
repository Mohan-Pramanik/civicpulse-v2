/**
 * FeedPage.js  –  updated to use Leaflet MapView
 * Replace:  src/pages/citizen/FeedPage.js
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIssues } from '../../api';
import { useAuth } from '../../context/AuthContext';
import IssueCard from '../../components/issues/IssueCard';
import { SkeletonCard, EmptyState } from '../../components/common';
import MapView from '../../components/common/MapView';   // ← Leaflet map

const CATS = [
  { key:'all',          label:'All',          icon:'🗺️' },
  { key:'road',         label:'Road',         icon:'🛣️' },
  { key:'water',        label:'Water',        icon:'💧' },
  { key:'waste',        label:'Waste',        icon:'🗑️' },
  { key:'electricity',  label:'Electricity',  icon:'⚡' },
  { key:'encroachment', label:'Encroachment', icon:'🏗️' },
  { key:'other',        label:'Other',        icon:'📋' },
];
const STATUSES = [
  { key:'',            label:'All Status' },
  { key:'pending',     label:'🔴 Pending' },
  { key:'assigned',    label:'🔵 Assigned' },
  { key:'in_progress', label:'🟡 In Progress' },
  { key:'resolved',    label:'🟢 Resolved' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function FeedPage() {
  const [issues,  setIssues]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [cat,     setCat]     = useState('all');
  const [status,  setStatus]  = useState('');
  const [search,  setSearch]  = useState('');
  const [busy,    setBusy]    = useState(true);
  const [showMap, setShowMap] = useState(true);   // toggle map / list
  const navigate  = useNavigate();
  const { user }  = useAuth();

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

      {/* Welcome Banner */}
      <div className="card fade-up" style={{ marginBottom:'1.25rem', background:'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(34,197,94,0.08))', borderColor:'rgba(99,102,241,0.2)', padding:'1.25rem 1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--f-display)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>
              {getGreeting()},
            </div>
            <div style={{ fontSize:22, fontWeight:900, fontFamily:'var(--f-display)', background:'linear-gradient(135deg, #a5b4fc, #6ee7b7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', letterSpacing:'-.3px' }}>
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
              📍 Kolkata, West Bengal · {total} active civic reports
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/report')}>➕ Report Issue</button>
            {user?.role === 'citizen' && (
              <button className="btn btn-sm" style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--r-sm)', boxShadow:'0 0 12px rgba(239,68,68,0.15)' }}
                onClick={() => navigate('/sos')}>🆘 Emergency</button>
            )}
          </div>
        </div>
      </div>

      {/* Map / List toggle */}
      <div className="fade-up d1" style={{ display:'flex', gap:8, marginBottom:'1rem' }}>
        <button
          className={`btn btn-sm ${showMap ? 'btn-primary' : 'btn-glass'}`}
          onClick={() => setShowMap(true)}
        >🗺️ Map View</button>
        <button
          className={`btn btn-sm ${!showMap ? 'btn-primary' : 'btn-glass'}`}
          onClick={() => setShowMap(false)}
        >📋 List View</button>
      </div>

      {/* Leaflet Map */}
      {showMap && (
        <div className="card fade-up d1" style={{ marginBottom:'1.25rem', padding:'1rem' }}>
          <MapView height={420} />
        </div>
      )}

      {/* Search */}
      <div className="feed-search-wrap fade-up d1" style={{ marginBottom:'1rem' }}>
        <span className="feed-search-icon">🔍</span>
        <input className="feed-search" placeholder="Search issues by title, area or description…"
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

      {/* Issue cards */}
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