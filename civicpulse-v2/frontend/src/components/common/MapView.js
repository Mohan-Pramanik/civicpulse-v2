import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIssues } from '../../api';

const MARKER_COLOR = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#06b6d4',
  low:      '#22c55e',
  default:  '#8b5cf6',
};

// Fallback map if Google Maps API key not set
function FallbackMap({ issues, onSelect }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(6,182,212,0.05))', border: '1px solid var(--glass-border)', borderRadius: 'var(--r)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
      <div style={{ fontSize: 40 }}>🗺️</div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Map View</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>
        Add your Google Maps API key to <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>REACT_APP_GOOGLE_MAPS_KEY</code> in Vercel environment variables to enable live map.
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
        {issues.length} issues loaded · showing list view below
      </div>
    </div>
  );
}

// Google Maps component - only rendered when API key exists
function GoogleMap({ issues, onSelect, filter }) {
  const mapRef    = useRef(null);
  const gmapRef   = useRef(null);
  const markersRef = useRef([]);
  const infoRef   = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => {
    if (!window.google || !mapRef.current) return;

    gmapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 22.5726, lng: 88.3639 },
      zoom: 12,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      ],
      disableDefaultUI: true,
      zoomControl: true,
    });

    infoRef.current = new window.google.maps.InfoWindow();
  }, []);

  useEffect(() => {
    if (!gmapRef.current || !window.google) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const filtered = issues.filter(i => {
      if (filter.status && i.status !== filter.status) return false;
      if (filter.priority && i.priority !== filter.priority) return false;
      if (filter.category && i.category !== filter.category) return false;
      return i.location?.coordinates?.length === 2;
    });

    filtered.forEach(issue => {
      const [lng, lat] = issue.location.coordinates;
      const color = MARKER_COLOR[issue.priority] || MARKER_COLOR.default;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: gmapRef.current,
        title: issue.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        infoRef.current.setContent(`
          <div style="background:#1e293b;color:#fff;padding:14px;border-radius:12px;max-width:220px;font-family:sans-serif">
            <div style="font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">${issue.priority} priority</div>
            <div style="font-size:14px;font-weight:700;margin-bottom:6px;line-height:1.3">${issue.title}</div>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:10px">📍 ${issue.location?.address || ''}</div>
            <div style="font-size:11px;background:rgba(34,197,94,0.15);color:#4ade80;border-radius:20px;padding:2px 10px;display:inline-block;margin-bottom:10px">${issue.status?.replace(/_/g,' ')}</div>
            <br/>
            <a href="/issues/${issue._id}" style="background:linear-gradient(135deg,#6366f1,#22c55e);color:#fff;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;display:inline-block">View Details →</a>
          </div>
        `);
        infoRef.current.open(gmapRef.current, marker);
        if (onSelect) onSelect(issue);
      });

      markersRef.current.push(marker);
    });

    // Auto-center if one issue
    if (filtered.length === 1) {
      const [lng, lat] = filtered[0].location.coordinates;
      gmapRef.current.setCenter({ lat, lng });
      gmapRef.current.setZoom(15);
    }
  }, [issues, filter, onSelect]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--r)' }} />;
}

const FILTER_INIT = { status: '', priority: '', category: '' };

export default function MapView({ height = 480 }) {
  const [issues,  setIssues]  = useState([]);
  const [busy,    setBusy]    = useState(true);
  const [filter,  setFilter]  = useState(FILTER_INIT);
  const [selected, setSelected] = useState(null);
  const hasGmaps = !!process.env.REACT_APP_GOOGLE_MAPS_KEY;
  const navigate = useNavigate();

  useEffect(() => {
    getIssues({ limit: 200 }).then(r => setIssues(r.data.data || [])).catch(() => {}).finally(() => setBusy(false));
  }, []);

  const setF = k => e => setFilter(f => ({ ...f, [k]: e.target.value }));

  // Filtered for list
  const filtered = issues.filter(i => {
    if (filter.status   && i.status   !== filter.status)   return false;
    if (filter.priority && i.priority !== filter.priority)  return false;
    if (filter.category && i.category !== filter.category)  return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {[
          { key: 'status',   opts: ['pending','assigned','in_progress','resolved'], label: 'Status' },
          { key: 'priority', opts: ['critical','high','medium','low'],              label: 'Priority' },
          { key: 'category', opts: ['road','water','waste','electricity','encroachment','other'], label: 'Category' },
        ].map(({ key, opts, label }) => (
          <select key={key} className="form-control" style={{ width: 140 }} value={filter[key]} onChange={setF(key)}>
            <option value="">All {label}</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {Object.values(filter).some(Boolean) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilter(FILTER_INIT)}>✕ Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {['critical','high','medium','low'].map(p => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: MARKER_COLOR[p], display: 'inline-block' }} />
              <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{p}</span>
            </span>
          ))}
        </span>
      </div>

      {/* Map */}
      <div style={{ height, borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--glass-border)', position: 'relative' }}>
        {busy ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
            <div className="spinner-sm" style={{ borderTopColor: '#6366f1', borderColor: 'rgba(99,102,241,0.2)' }} />
            Loading map data…
          </div>
        ) : hasGmaps ? (
          <GoogleMap issues={issues} filter={filter} onSelect={setSelected} />
        ) : (
          <FallbackMap issues={filtered} />
        )}

        {/* Issue count overlay */}
        <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)', padding: '6px 14px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--f-display)', fontWeight: 600 }}>
          📍 {filtered.length} issues
        </div>
      </div>

      {/* Selected issue popup */}
      {selected && (
        <div className="card scale-in" style={{ marginTop: '1rem', borderLeft: `3px solid ${MARKER_COLOR[selected.priority]}`, boxShadow: `var(--s), -2px 0 16px ${MARKER_COLOR[selected.priority]}40` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--f-display)', color: 'var(--text-primary)', marginBottom: 4 }}>{selected.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {selected.location?.address}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/issues/${selected._id}`)}>View →</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}