/**
 * IssueMap.js  –  Single-issue map with place search for ReportPage & IssueDetailPage
 *
 * Modes:
 *   picker=false  →  view-only map showing a pinned location (IssueDetailPage)
 *   picker=true   →  click to pin + place search (ReportPage Step 2)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  }
  .leaflet-popup-tip { background: rgba(15,23,42,0.97) !important; }
  .leaflet-popup-content { margin: 0 !important; }
  .leaflet-popup-close-button { color: #94a3b8 !important; }
  .leaflet-control-attribution {
    background: rgba(15,23,42,0.7) !important;
    color: #475569 !important;
    font-size: 10px !important;
  }
  .leaflet-control-attribution a { color: #6366f1 !important; }
  /* search dropdown */
  .im-search-drop {
    position: absolute;
    top: 100%; left: 0; right: 0;
    background: rgba(15,23,42,0.98);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 0 0 12px 12px;
    z-index: 2000;
    max-height: 220px;
    overflow-y: auto;
    box-shadow: 0 12px 32px rgba(0,0,0,0.5);
  }
  .im-search-item {
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    transition: background 0.15s;
  }
  .im-search-item:hover { background: rgba(99,102,241,0.18); }
  .im-search-item:last-child { border-bottom: none; }
`;

// ── custom pin icon ───────────────────────────────────────────────────────────
function makePin(color = '#6366f1') {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:3px solid #fff;
      box-shadow:0 4px 20px ${color}80;
    "></div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 30],
    popupAnchor:[0, -32],
  });
}

// ── fly to coords ─────────────────────────────────────────────────────────────
function FlyTo({ lat, lng, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([parseFloat(lat), parseFloat(lng)], zoom, { duration: 0.7 });
  }, [lat, lng, zoom, map]);
  return null;
}

// ── click handler (picker mode) ───────────────────────────────────────────────
function ClickPicker({ onPick }) {
  useMapEvents({
    click(e) {
      if (onPick) onPick(
        e.latlng.lat.toFixed(6),
        e.latlng.lng.toFixed(6)
      );
    },
  });
  return null;
}

// ── Main IssueMap ─────────────────────────────────────────────────────────────
export default function IssueMap({
  lat,
  lng,
  title   = 'Issue Location',
  address = '',
  color   = '#6366f1',
  height  = 280,
  picker  = false,
  onPick  = null,
}) {
  const [pinLat,       setPinLat]       = useState(lat   || null);
  const [pinLng,       setPinLng]       = useState(lng   || null);
  const [flyLat,       setFlyLat]       = useState(lat   || null);
  const [flyLng,       setFlyLng]       = useState(lng   || null);

  // search state
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [showDrop,     setShowDrop]     = useState(false);

  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);
  const KOLKATA     = [22.5726, 88.3639];

  // sync external lat/lng (e.g. GPS button)
  useEffect(() => {
    if (lat && lng) {
      setPinLat(lat); setPinLng(lng);
      setFlyLat(lat); setFlyLng(lng);
    }
  }, [lat, lng]);

  // close dropdown on outside click
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Nominatim search ──────────────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (!q.trim() || q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q + ' Kolkata')}&format=json&limit=6` +
        `&viewbox=88.2,22.4,88.5,22.7&bounded=0&addressdetails=1`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setResults(data);
      setShowDrop(true);
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  const handleInput = e => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(() => doSearch(q), 400);
  };

  const handleKey = e => {
    if (e.key === 'Enter') { clearTimeout(debounceRef.current); doSearch(query); }
    if (e.key === 'Escape') setShowDrop(false);
  };

  // user picks a search result → pin it + fly to it
  const pickResult = result => {
    const lt = parseFloat(result.lat).toFixed(6);
    const ln = parseFloat(result.lon).toFixed(6);
    const label = result.display_name.split(',').slice(0, 3).join(', ');

    setPinLat(lt); setPinLng(ln);
    setFlyLat(lt); setFlyLng(ln);
    setQuery(label);
    setShowDrop(false);

    if (onPick) onPick(lt, ln);
  };

  // user clicks map → pin it
  const handleMapClick = (lt, ln) => {
    setPinLat(lt); setPinLng(ln);
    setFlyLat(null); setFlyLng(null); // already at the clicked position
    if (onPick) onPick(lt, ln);
  };

  const hasCentre = flyLat && flyLng;
  const centre    = hasCentre ? [parseFloat(flyLat), parseFloat(flyLng)] : KOLKATA;

  if (!picker && !lat && !lng) return null;

  return (
    <div>
      <style>{MAP_STYLE}</style>

      {/* ── Search bar (picker mode only) ──────────────────────────── */}
      {picker && (
        <div ref={wrapRef} style={{ position: 'relative', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:15, pointerEvents:'none', zIndex:1 }}>🔍</span>
              <input
                className="form-control"
                style={{ paddingLeft: 36, paddingRight: query ? 34 : 14 }}
                placeholder="Search a place… e.g. Salt Lake, Howrah Bridge, Park Street"
                value={query}
                onChange={handleInput}
                onKeyDown={handleKey}
                onFocus={() => results.length && setShowDrop(true)}
                autoComplete="off"
              />
              {searching && (
                <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)' }}>
                  <div className="spinner-sm" style={{ width:14, height:14, borderTopColor:'#6366f1', borderColor:'rgba(99,102,241,0.2)' }} />
                </span>
              )}
              {query && !searching && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setShowDrop(false); }}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:15 }}
                >✕</button>
              )}
            </div>
          </div>

          {/* Results dropdown */}
          {showDrop && results.length > 0 && (
            <div className="im-search-drop">
              {results.map((r, i) => {
                const name = r.display_name.split(',').slice(0, 3).join(', ');
                const sub  = r.display_name.split(',').slice(3, 5).join(', ');
                return (
                  <div key={i} className="im-search-item" onClick={() => pickResult(r)}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>📍 {name}</div>
                    {sub && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {showDrop && !searching && results.length === 0 && query.length >= 3 && (
            <div className="im-search-drop">
              <div style={{ padding:'14px', fontSize:13, color:'var(--text-muted)', textAlign:'center' }}>
                No places found for "{query}"
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Hint text ──────────────────────────────────────────────── */}
      {picker && (
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
          🖱️ Or click directly on the map to drop a pin
          {pinLat && (
            <span style={{ color:'#22c55e', fontWeight:600, marginLeft:4 }}>
              ✅ {parseFloat(pinLat).toFixed(4)}, {parseFloat(pinLng).toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* ── Map ────────────────────────────────────────────────────── */}
      <div style={{
        height,
        borderRadius: 'var(--r)',
        overflow: 'hidden',
        border: picker ? '2px dashed rgba(99,102,241,0.4)' : '1px solid var(--glass-border)',
        cursor: picker ? 'crosshair' : 'default',
      }}>
        <MapContainer
          center={centre}
          zoom={hasCentre ? 15 : 12}
          style={{ width:'100%', height:'100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Fly when search result or GPS changes */}
          {flyLat && flyLng && <FlyTo lat={flyLat} lng={flyLng} />}

          {/* Click to pin (picker mode) */}
          {picker && <ClickPicker onPick={handleMapClick} />}

          {/* Pin marker */}
          {pinLat && pinLng && (
            <Marker
              position={[parseFloat(pinLat), parseFloat(pinLng)]}
              icon={makePin(color)}
            />
          )}
        </MapContainer>
      </div>

      {/* Coords + OSM link (view-only mode) */}
      {!picker && pinLat && pinLng && (
        <div style={{ marginTop:6, fontSize:11, color:'var(--text-muted)', display:'flex', gap:12 }}>
          <span>🌐 {parseFloat(pinLat).toFixed(5)}°N, {parseFloat(pinLng).toFixed(5)}°E</span>
          <a
            href={`https://www.openstreetmap.org/?mlat=${pinLat}&mlon=${pinLng}#map=16/${pinLat}/${pinLng}`}
            target="_blank" rel="noopener noreferrer"
            style={{ color:'#6366f1', textDecoration:'none' }}
          >
            Open in OSM ↗
          </a>
        </div>
      )}
    </div>
  );
}