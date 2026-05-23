/**
 * IssueMap.js  –  Single-issue location map for IssueDetailPage & ReportPage
 *
 * Drop into:  src/components/common/IssueMap.js
 *
 * Usage in IssueDetailPage:
 *   <IssueMap lat={lat} lng={lng} title={issue.title} address={issue.location.address} />
 *
 * Usage in ReportPage (picker mode):
 *   <IssueMap picker onPick={(lat, lng) => setForm(f => ({...f, lat, lng}))} />
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── dark tile CSS (same as MapView) ─────────────────────────────────────────
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
`;

// ── Custom pin icon ──────────────────────────────────────────────────────────
function makeIcon(color = '#6366f1') {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:32px; height:32px; border-radius:50% 50% 50% 0;
        background:${color}; transform:rotate(-45deg);
        border:3px solid #fff;
        box-shadow:0 4px 16px ${color}80;
        display:flex; align-items:center; justify-content:center;
      ">
        <div style="transform:rotate(45deg); color:#fff; font-size:14px;">📍</div>
      </div>
    `,
    iconSize:   [32, 32],
    iconAnchor: [16, 32],
    popupAnchor:[0, -34],
  });
}

// ── Click-to-pick handler (for ReportPage picker mode) ──────────────────────
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      if (onPick) onPick(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    },
  });
  return null;
}

// ── Auto-pan when lat/lng change ─────────────────────────────────────────────
function PanTo({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([parseFloat(lat), parseFloat(lng)], 15, { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function IssueMap({
  lat,
  lng,
  title   = 'Issue Location',
  address = '',
  color   = '#6366f1',
  height  = 260,
  picker  = false,    // set true in ReportPage
  onPick  = null,     // (lat, lng) => void
}) {
  const [pickedLat, setPickedLat] = useState(lat || null);
  const [pickedLng, setPickedLng] = useState(lng || null);

  const hasCoords = lat && lng;
  const showLat   = picker ? pickedLat : lat;
  const showLng   = picker ? pickedLng : lng;

  const KOLKATA = [22.5726, 88.3639];
  const centre  = showLat && showLng ? [parseFloat(showLat), parseFloat(showLng)] : KOLKATA;

  const handlePick = (lt, ln) => {
    setPickedLat(lt);
    setPickedLng(ln);
    if (onPick) onPick(lt, ln);
  };

  if (!picker && !hasCoords) return null; // nothing to show in view-only mode without coords

  return (
    <div>
      <style>{MAP_STYLE}</style>

      {picker && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          🖱️ Click on the map to pin the exact location
          {pickedLat && <span style={{ color: '#22c55e', fontWeight: 600 }}>✅ {pickedLat}, {pickedLng}</span>}
        </div>
      )}

      <div style={{ height, borderRadius: 'var(--r)', overflow: 'hidden', border: picker ? '2px dashed rgba(99,102,241,0.4)' : '1px solid var(--glass-border)', cursor: picker ? 'crosshair' : 'default' }}>
        <MapContainer
          center={centre}
          zoom={showLat && showLng ? 15 : 12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <PanTo lat={showLat} lng={showLng} />

          {picker && <ClickHandler onPick={handlePick} />}

          {showLat && showLng && (
            <Marker
              position={[parseFloat(showLat), parseFloat(showLng)]}
              icon={makeIcon(color)}
            >
              <Popup minWidth={180}>
                <div style={{ padding: '10px 14px', fontFamily: 'sans-serif' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{title}</div>
                  {address && <div style={{ fontSize: 11, color: '#94a3b8' }}>📍 {address}</div>}
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{showLat}, {showLng}</div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Coords display under map */}
      {showLat && showLng && !picker && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
          <span>🌐 {parseFloat(showLat).toFixed(5)}°N, {parseFloat(showLng).toFixed(5)}°E</span>
          <a
            href={`https://www.openstreetmap.org/?mlat=${showLat}&mlon=${showLng}#map=16/${showLat}/${showLng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6366f1', textDecoration: 'none' }}
          >
            Open in OSM ↗
          </a>
        </div>
      )}
    </div>
  );
}