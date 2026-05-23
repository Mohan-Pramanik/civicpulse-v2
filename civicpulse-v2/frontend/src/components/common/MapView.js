/**
 * MapView.js  –  Leaflet map with Nominatim place search for CivicPulse
 * Free, no API key needed (OpenStreetMap + Nominatim geocoding)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getIssues } from '../../api';

// ── colours ──────────────────────────────────────────────────────────────────
const MARKER_COLOR = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#06b6d4',
  low:      '#22c55e',
  default:  '#8b5cf6',
};

const STATUS_LABEL = {
  pending:     '🔴 Pending',
  assigned:    '🔵 Assigned',
  in_progress: '🟡 In Progress',
  resolved:    '🟢 Resolved',
  closed:      '⚫ Closed',
  rejected:    '❌ Rejected',
};

// ── search result pin icon ────────────────────────────────────────────────────
const searchPin = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    background:#6366f1;transform:rotate(-45deg);
    border:3px solid #fff;
    box-shadow:0 4px 16px rgba(99,102,241,0.6);
  "></div>`,
  iconSize:   [28, 28],
  iconAnchor: [14, 28],
  popupAnchor:[0, -30],
});

// ── FlyTo helper ─────────────────────────────────────────────────────────────
function FlyTo({ coords, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom, { duration: 0.9 });
  }, [coords, zoom, map]);
  return null;
}

// ── dark tile CSS ─────────────────────────────────────────────────────────────
const MAP_STYLE = `
  .leaflet-container { background: #0f172a !important; }
  .leaflet-tile-pane { filter: invert(1) hue-rotate(200deg) brightness(0.7) saturate(0.6); }
  .leaflet-control-zoom a {
    background: rgba(15,23,42,0.92) !important;
    color: #94a3b8 !important;
    border-color: rgba(255,255,255,0.1) !important;
  }
  .leaflet-control-zoom a:hover { background: rgba(99,102,241,0.3) !important; color: #fff !important; }
  .leaflet-popup-content-wrapper {
    background: rgba(15,23,42,0.97) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 14px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
    backdrop-filter: blur(16px);
  }
  .leaflet-popup-tip { background: rgba(15,23,42,0.97) !important; }
  .leaflet-popup-content { margin: 0 !important; }
  .leaflet-popup-close-button { color: #94a3b8 !important; top:10px !important; right:12px !important; font-size:18px !important; }
  .leaflet-popup-close-button:hover { color: #fff !important; }
  .leaflet-attribution-flag { display: none !important; }
  .leaflet-control-attribution {
    background: rgba(15,23,42,0.7) !important;
    color: #475569 !important;
    font-size: 10px !important;
  }
  .leaflet-control-attribution a { color: #6366f1 !important; }
  /* Search results dropdown */
  .cp-search-results {
    position: absolute;
    top: 100%;
    left: 0; right: 0;
    background: rgba(15,23,42,0.98);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 0 0 12px 12px;
    z-index: 2000;
    max-height: 240px;
    overflow-y: auto;
    box-shadow: 0 12px 32px rgba(0,0,0,0.5);
  }
  .cp-search-result-item {
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    transition: background 0.15s;
  }
  .cp-search-result-item:hover { background: rgba(99,102,241,0.15); }
  .cp-search-result-item:last-child { border-bottom: none; }
`;

const FILTER_INIT = { status: '', priority: '', category: '' };
const KOLKATA = [22.5726, 88.3639];

// ── Main MapView ──────────────────────────────────────────────────────────────
export default function MapView({ height = 480 }) {
  const [issues,       setIssues]       = useState([]);
  const [busy,         setBusy]         = useState(true);
  const [filter,       setFilter]       = useState(FILTER_INIT);
  const [selected,     setSelected]     = useState(null);
  const [flyTo,        setFlyTo]        = useState(null);
  const [flyZoom,      setFlyZoom]      = useState(15);

  // place search state
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchResults,setSearchResults]= useState([]);
  const [searching,    setSearching]    = useState(false);
  const [searchPin_,   setSearchPin_]   = useState(null); // { lat, lng, label }
  const [showResults,  setShowResults]  = useState(false);

  const searchRef   = useRef(null);
  const debounceRef = useRef(null);
  const navigate    = useNavigate();

  // load issues
  useEffect(() => {
    getIssues({ limit: 500 })
      .then(r => setIssues(r.data.data || []))
      .catch(() => {})
      .finally(() => setBusy(false));
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Nominatim geocode search ──────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (!q.trim() || q.trim().length < 3) { setSearchResults([]); return; }
    setSearching(true);
    try {
      // bias results toward Kolkata using viewbox
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q + ' Kolkata')}&format=json&limit=6` +
        `&viewbox=88.2,22.4,88.5,22.7&bounded=0&addressdetails=1`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setSearchResults(data);
      setShowResults(true);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  const handleSearchInput = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults([]); setShowResults(false); return; }
    debounceRef.current = setTimeout(() => doSearch(q), 400);
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') { clearTimeout(debounceRef.current); doSearch(searchQuery); }
    if (e.key === 'Escape') { setShowResults(false); }
  };

  const selectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const label = result.display_name.split(',').slice(0, 3).join(', ');
    setSearchPin_({ lat, lng, label });
    setFlyTo([lat, lng]);
    setFlyZoom(15);
    setSearchQuery(label);
    setShowResults(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchPin_(null);
    setShowResults(false);
  };

  // ── filter helpers ────────────────────────────────────────────────────────
  const setF = k => e => setFilter(f => ({ ...f, [k]: e.target.value }));

  const geoIssues = issues.filter(i => {
    const lat = i.location?.lat; const lng = i.location?.lng;
    if (!lat || !lng) return false;
    if (filter.status   && i.status   !== filter.status)   return false;
    if (filter.priority && i.priority !== filter.priority)  return false;
    if (filter.category && i.category !== filter.category)  return false;
    return true;
  });

  const noGeoIssues = issues.filter(i => {
    const lat = i.location?.lat; const lng = i.location?.lng;
    if (lat && lng) return false;
    if (filter.status   && i.status   !== filter.status)   return false;
    if (filter.priority && i.priority !== filter.priority)  return false;
    if (filter.category && i.category !== filter.category)  return false;
    return true;
  });

  const selectIssue = (issue) => {
    setSelected(issue);
    const lat = issue.location?.lat; const lng = issue.location?.lng;
    if (lat && lng) { setFlyTo([lat, lng]); setFlyZoom(16); }
  };

  return (
    <div>
      <style>{MAP_STYLE}</style>

      {/* ── Place search bar ──────────────────────────────────────────── */}
      <div ref={searchRef} style={{ position: 'relative', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none', zIndex: 1 }}>🔍</span>
            <input
              className="form-control"
              style={{ paddingLeft: 38, paddingRight: searchQuery ? 36 : 14 }}
              placeholder="Search a place… e.g. Park Street, Salt Lake, Howrah"
              value={searchQuery}
              onChange={handleSearchInput}
              onKeyDown={handleSearchKey}
              onFocus={() => searchResults.length && setShowResults(true)}
              autoComplete="off"
            />
            {searching && (
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <div className="spinner-sm" style={{ width: 14, height: 14, borderTopColor: '#6366f1', borderColor: 'rgba(99,102,241,0.2)' }} />
              </span>
            )}
            {searchQuery && !searching && (
              <button onClick={clearSearch} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
            )}
          </div>
          <button
            className="btn btn-glass btn-sm"
            onClick={() => { setFlyTo([...KOLKATA]); setFlyZoom(12); clearSearch(); }}
            title="Reset to Kolkata"
            style={{ flexShrink: 0 }}
          >
            🏙️ Reset
          </button>
        </div>

        {/* Dropdown results */}
        {showResults && searchResults.length > 0 && (
          <div className="cp-search-results">
            {searchResults.map((r, i) => {
              const name    = r.display_name.split(',').slice(0, 3).join(', ');
              const subname = r.display_name.split(',').slice(3, 5).join(', ');
              return (
                <div key={i} className="cp-search-result-item" onClick={() => selectResult(r)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                    📍 {name}
                  </div>
                  {subname && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subname}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {showResults && !searching && searchResults.length === 0 && searchQuery.length >= 3 && (
          <div className="cp-search-results">
            <div style={{ padding: '14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              No places found for "{searchQuery}"
            </div>
          </div>
        )}
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        {[
          { key: 'status',   opts: ['pending','assigned','in_progress','resolved','closed'],      label: 'Status' },
          { key: 'priority', opts: ['critical','high','medium','low'],                            label: 'Priority' },
          { key: 'category', opts: ['road','water','waste','electricity','encroachment','other'], label: 'Category' },
        ].map(({ key, opts, label }) => (
          <select key={key} className="form-control" style={{ width: 140 }}
            value={filter[key]} onChange={setF(key)}>
            <option value="">All {label}</option>
            {opts.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
          </select>
        ))}
        {Object.values(filter).some(Boolean) && (
          <button className="btn btn-glass btn-sm" onClick={() => setFilter(FILTER_INIT)}>✕ Clear filters</button>
        )}

        {/* Priority legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {Object.entries(MARKER_COLOR).filter(([k]) => k !== 'default').map(([p, c]) => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block', boxShadow: `0 0 6px ${c}` }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Map ──────────────────────────────────────────────────────── */}
      <div style={{ height, borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--glass-border)', position: 'relative' }}>
        {busy ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)', background: '#0f172a' }}>
            <div className="spinner-sm" style={{ borderTopColor: '#6366f1', borderColor: 'rgba(99,102,241,0.2)' }} />
            Loading map data…
          </div>
        ) : (
          <MapContainer center={KOLKATA} zoom={12} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {flyTo && <FlyTo coords={flyTo} zoom={flyZoom} />}

            {/* Search result pin */}
            {searchPin_ && (
              <Marker position={[searchPin_.lat, searchPin_.lng]} icon={searchPin}>
                <Popup minWidth={180}>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>📍 {searchPin_.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{searchPin_.lat.toFixed(5)}, {searchPin_.lng.toFixed(5)}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Issue markers */}
            {geoIssues.map(issue => {
              const lat = issue.location?.lat; const lng = issue.location?.lng;
              const color = MARKER_COLOR[issue.priority] || MARKER_COLOR.default;
              const isSelected = selected?._id === issue._id;
              return (
                <CircleMarker
                  key={issue._id}
                  center={[lat, lng]}
                  radius={isSelected ? 14 : 9}
                  pathOptions={{
                    fillColor:   color,
                    fillOpacity: isSelected ? 1 : 0.85,
                    color:       '#fff',
                    weight:      isSelected ? 3 : 1.5,
                  }}
                  eventHandlers={{ click: () => selectIssue(issue) }}
                >
                  <Popup minWidth={220} maxWidth={280}>
                    <div style={{ padding: '14px 16px', fontFamily: 'sans-serif' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                        ● {issue.priority} priority
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4, marginBottom: 6 }}>
                        {issue.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                        📍 {issue.location?.address || 'No address'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: 20, padding: '2px 10px' }}>
                          {STATUS_LABEL[issue.status] || issue.status}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>🏛️ {issue.department?.split(' ').slice(0,2).join(' ')}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/issues/${issue._id}`)}
                        style={{ width: '100%', background: 'linear-gradient(135deg,#6366f1,#22c55e)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        View Details →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}

        {/* Issue count badge */}
        {!busy && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--r-sm)', padding: '6px 14px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--f-display)', fontWeight: 600 }}>
            📍 {geoIssues.length} on map · {noGeoIssues.length} no GPS
          </div>
        )}
      </div>

      {/* ── Selected issue card ───────────────────────────────────────── */}
      {selected && (
        <div className="card scale-in" style={{ marginTop: '1rem', borderLeft: `3px solid ${MARKER_COLOR[selected.priority] || MARKER_COLOR.default}`, boxShadow: `var(--s), -2px 0 16px ${(MARKER_COLOR[selected.priority] || MARKER_COLOR.default)}40` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MARKER_COLOR[selected.priority], textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                {selected.priority} · {selected.category}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--f-display)', color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {selected.location?.address}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/issues/${selected._id}`)}>View →</button>
              <button className="btn btn-glass btn-sm" onClick={() => { setSelected(null); setFlyTo(null); }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ── No-GPS issues list ────────────────────────────────────────── */}
      {noGeoIssues.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="section-label">📋 {noGeoIssues.length} issue{noGeoIssues.length > 1 ? 's' : ''} without GPS (not shown on map)</div>
          {noGeoIssues.slice(0, 5).map(issue => (
            <div key={issue._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => navigate(`/issues/${issue._id}`)}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{issue.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍 {issue.location?.address || 'No address'}</div>
              </div>
              <span style={{ fontSize: 11, background: `${MARKER_COLOR[issue.priority]}20`, color: MARKER_COLOR[issue.priority], borderRadius: 20, padding: '2px 10px', flexShrink: 0 }}>
                {issue.priority}
              </span>
            </div>
          ))}
          {noGeoIssues.length > 5 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
              + {noGeoIssues.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}