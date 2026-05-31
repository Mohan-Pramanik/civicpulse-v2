import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CATEGORY_COLORS = {
  road:         '#6366f1',
  water:        '#06b6d4',
  waste:        '#22c55e',
  electricity:  '#f59e0b',
  encroachment: '#8b5cf6',
  other:        '#94a3b8',
};

const CATEGORY_ICONS = {
  road: '🛣️', water: '💧', waste: '🗑️',
  electricity: '⚡', encroachment: '🚧', other: '📌',
};

const WEIGHT = {
  pending: 1.0, assigned: 0.85, in_progress: 0.7,
  pending_verification: 0.5, resolved: 0.2, closed: 0.1, rejected: 0.05,
};

const MAP_STYLE = `
  .leaflet-container { background: #060b14 !important; }
  .leaflet-tile-pane { filter: invert(1) hue-rotate(200deg) brightness(0.55) saturate(0.5) contrast(1.1); }
  .leaflet-control-zoom {
    border: 1px solid rgba(99,102,241,0.25) !important;
    border-radius: 10px !important;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
  }
  .leaflet-control-zoom a {
    background: rgba(6,11,20,0.95) !important;
    color: #6366f1 !important;
    border-color: rgba(99,102,241,0.2) !important;
    font-size: 16px !important;
    width: 32px !important; height: 32px !important;
    line-height: 32px !important;
    transition: all 0.2s !important;
  }
  .leaflet-control-zoom a:hover {
    background: rgba(99,102,241,0.2) !important;
    color: #fff !important;
  }
  .leaflet-control-attribution {
    background: rgba(6,11,20,0.8) !important;
    color: #334155 !important;
    font-size: 9px !important;
    border-top: 1px solid rgba(255,255,255,0.05) !important;
    padding: 3px 8px !important;
  }
  .leaflet-control-attribution a { color: #6366f1 !important; }
`;

function HeatLayer({ points }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) { try { map.removeLayer(layerRef.current); } catch {} layerRef.current = null; }
    if (!points.length) return;

    const CanvasHeat = L.Layer.extend({
      onAdd(map) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'leaflet-heat-canvas');
        const size = map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        Object.assign(this._canvas.style, {
          position: 'absolute', top: 0, left: 0,
          pointerEvents: 'none', zIndex: 300,
        });
        map.getPanes().overlayPane.appendChild(this._canvas);
        map.on('moveend zoomend resize', this._redraw, this);
        this._redraw();
      },
      onRemove(map) {
        map.off('moveend zoomend resize', this._redraw, this);
        if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
      },
      _redraw() {
        if (!this._canvas || !this._map) return;
        const size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        const ctx = this._canvas.getContext('2d');
        ctx.clearRect(0, 0, size.x, size.y);
        const zoom = this._map.getZoom();
        const RADIUS = Math.max(20, Math.min(60, zoom * 4));

        // Draw glow pass first
        points.forEach(([lat, lng, intensity = 0.5]) => {
          const pt = this._map.latLngToContainerPoint([lat, lng]);
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, RADIUS * 1.8);
          const alpha = Math.min(intensity * 0.35, 0.35);
          grad.addColorStop(0, `rgba(239,68,68,${alpha})`);
          grad.addColorStop(1, `rgba(239,68,68,0)`);
          ctx.beginPath();
          ctx.fillStyle = grad;
          ctx.arc(pt.x, pt.y, RADIUS * 1.8, 0, Math.PI * 2);
          ctx.fill();
        });

        // Draw core blobs
        points.forEach(([lat, lng, intensity = 0.5]) => {
          const pt = this._map.latLngToContainerPoint([lat, lng]);
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, RADIUS);
          const alpha = Math.min(intensity * 0.95, 0.92);
          const r1 = intensity > 0.8 ? '255,50,50' : intensity > 0.6 ? '251,146,60' : intensity > 0.4 ? '99,102,241' : '6,182,212';
          const r2 = intensity > 0.8 ? '220,38,38' : intensity > 0.6 ? '245,158,11' : intensity > 0.4 ? '79,70,229' : '8,145,178';
          grad.addColorStop(0,   `rgba(${r1},${alpha})`);
          grad.addColorStop(0.4, `rgba(${r1},${alpha * 0.7})`);
          grad.addColorStop(0.75,`rgba(${r2},${alpha * 0.3})`);
          grad.addColorStop(1,   `rgba(${r2},0)`);
          ctx.beginPath();
          ctx.fillStyle = grad;
          ctx.arc(pt.x, pt.y, RADIUS, 0, Math.PI * 2);
          ctx.fill();
        });
      },
    });

    layerRef.current = new CanvasHeat();
    map.addLayer(layerRef.current);
    return () => { if (layerRef.current) { try { map.removeLayer(layerRef.current); } catch {} layerRef.current = null; } };
  }, [map, points]);

  return null;
}

function KolkataCenter() {
  const map = useMap();
  useEffect(() => { map.setView([22.5726, 88.3639], 12); }, [map]);
  return null;
}

function aggregateByArea(issues) {
  const agg = {};
  for (const issue of issues) {
    const key = issue.location?.area || issue.location?.ward || 'Unknown';
    if (!agg[key]) agg[key] = { name: key, total: 0, pending: 0, resolved: 0, categories: {} };
    agg[key].total++;
    if (['resolved', 'closed'].includes(issue.status)) agg[key].resolved++;
    else agg[key].pending++;
    const cat = issue.category || 'other';
    agg[key].categories[cat] = (agg[key].categories[cat] || 0) + 1;
  }
  return Object.values(agg).sort((a, b) => b.total - a.total);
}

const PULSE_CSS = `
@keyframes hm-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.05)} }
@keyframes hm-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes hm-scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
.hm-fade { animation: hm-fade-up 0.5s ease both; }
.hm-d1  { animation-delay: 0.05s; }
.hm-d2  { animation-delay: 0.12s; }
.hm-d3  { animation-delay: 0.20s; }
.hm-d4  { animation-delay: 0.28s; }
.hm-area-row:hover { background: rgba(99,102,241,0.08) !important; border-color: rgba(99,102,241,0.3) !important; }
.hm-filter-btn { transition: all 0.18s; }
.hm-filter-btn:hover { border-color: rgba(99,102,241,0.5) !important; color: #a5b4fc !important; }
.hm-stat-card:hover { transform: translateY(-2px); border-color: rgba(99,102,241,0.35) !important; }
`;

export default function HeatmapPage() {
  const [issues,     setIssues]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filterCat,  setFilterCat]  = useState('all');
  const [filterStat, setFilterStat] = useState('active');
  const [activeArea, setActiveArea] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('cp_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const { data } = await axios.get(`${API}/issues?limit=500`, { headers });
        const issueList = Array.isArray(data.data) ? data.data : [];
        setIssues(issueList);
        setLastUpdate(new Date());
      } catch {
        setError('Could not load issues.');
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = issues.filter(iss => {
    if (filterCat !== 'all' && iss.category !== filterCat) return false;
    if (filterStat === 'active' && ['resolved', 'closed', 'rejected'].includes(iss.status)) return false;
    if (filterStat === 'resolved' && !['resolved', 'closed'].includes(iss.status)) return false;
    return true;
  });

  const heatPoints = filtered
    .filter(iss => iss.location?.lat && iss.location?.lng)
    .map(iss => [parseFloat(iss.location.lat), parseFloat(iss.location.lng), WEIGHT[iss.status] || 0.5]);

  const areaStats = aggregateByArea(filtered);
  const maxTotal  = areaStats[0]?.total || 1;
  const activeCount   = filtered.filter(i => !['resolved','closed'].includes(i.status)).length;
  const resolvedCount = filtered.filter(i => ['resolved','closed'].includes(i.status)).length;

  const stats = [
    { label: 'Total Issues', value: filtered.length, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: '📊', sub: 'in view' },
    { label: 'Active',       value: activeCount,     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: '🔥', sub: 'need attention' },
    { label: 'Resolved',     value: resolvedCount,   color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '✅', sub: 'fixed' },
    { label: 'Areas',        value: areaStats.length,color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', icon: '🏘️', sub: 'affected' },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '0 0 2rem', fontFamily: 'inherit' }}>
      <style>{PULSE_CSS}{MAP_STYLE}</style>

      {/* ── Header ── */}
      <div className="hm-fade hm-d1" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
              }}>🗺️</div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                Issue Heatmap
              </h1>
              {/* Live dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
                  animation: 'hm-pulse 2s ease-in-out infinite' }} />
                LIVE
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              Kolkata civic issue hotspots · {heatPoints.length} GPS-pinned · {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString()}` : ''}
            </p>
          </div>

          {/* Filters inline */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Category pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['all', ...Object.keys(CATEGORY_COLORS)].map(c => (
                <button key={c} className="hm-filter-btn" onClick={() => setFilterCat(c)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid',
                  borderColor: filterCat === c ? (CATEGORY_COLORS[c] || '#6366f1') : 'rgba(255,255,255,0.1)',
                  background: filterCat === c ? `${CATEGORY_COLORS[c] || '#6366f1'}22` : 'transparent',
                  color: filterCat === c ? (CATEGORY_COLORS[c] || '#a5b4fc') : 'var(--text-muted)',
                  transition: 'all 0.18s',
                }}>
                  {c === 'all' ? '⬡ All' : `${CATEGORY_ICONS[c]} ${c.charAt(0).toUpperCase() + c.slice(1)}`}
                </button>
              ))}
            </div>

            {/* Status toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 3 }}>
              {[['active','🔥 Active'],['all','⬡ All'],['resolved','✅ Done']].map(([val, label]) => (
                <button key={val} onClick={() => setFilterStat(val)} style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', border: 'none',
                  background: filterStat === val ? 'rgba(99,102,241,0.25)' : 'transparent',
                  color: filterStat === val ? '#a5b4fc' : 'var(--text-muted)',
                  transition: 'all 0.18s',
                }}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="hm-fade hm-d2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.25rem' }}>
        {stats.map(s => (
          <div key={s.label} className="hm-stat-card" style={{
            background: s.bg, border: `1px solid ${s.color}28`,
            borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            transition: 'all 0.2s', cursor: 'default',
          }}>
            <div style={{ fontSize: 26 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label} <span style={{ opacity: 0.6 }}>· {s.sub}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div className="hm-fade hm-d3" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', alignItems: 'start' }}>

        {/* Map card */}
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          border: '1px solid rgba(99,102,241,0.15)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        }}>
          {/* Map header bar */}
          <div style={{
            padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(6,11,20,0.95)', borderBottom: '1px solid rgba(99,102,241,0.12)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                Kolkata · Live Hotspot View
              </span>
            </div>
            {/* Heat legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Cool</span>
              <div style={{ width: 80, height: 8, borderRadius: 4, background: 'linear-gradient(90deg,#06b6d4,#6366f1,#f59e0b,#ef4444)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Hot</span>
            </div>
          </div>

          {loading ? (
            <div style={{ height: 540, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#060b14' }}>
              <div style={{ position: 'relative', width: 48, height: 48 }}>
                <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(99,102,241,0.2)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading Kolkata issue data…</span>
            </div>
          ) : error ? (
            <div style={{ height: 540, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060b14', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 32 }}>⚠️</div>
              <div style={{ fontSize: 13, color: '#ef4444' }}>{error}</div>
            </div>
          ) : (
            <MapContainer center={[22.5726, 88.3639]} zoom={12} style={{ width: '100%', height: 540 }} zoomControl={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              <KolkataCenter />
              <HeatLayer points={heatPoints} />
            </MapContainer>
          )}

          {/* Map footer */}
          <div style={{
            padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(6,11,20,0.95)', borderTop: '1px solid rgba(99,102,241,0.1)',
            fontSize: 11, color: 'var(--text-muted)',
          }}>
            <div style={{ display: 'flex', align: 'center', gap: 12 }}>
              <span>🔴 {heatPoints.length} pinned issues</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{filtered.length - heatPoints.length} without GPS</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['#ef4444','Critical'],['#f59e0b','High'],['#6366f1','Medium'],['#06b6d4','Low']].map(([c,l]) => (
                <span key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:c }} />
                  <span>{l}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Ward breakdown */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(99,102,241,0.06)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                🏘 Area Breakdown
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                {areaStats.length} zones
              </span>
            </div>

            <div style={{ maxHeight: 420, overflowY: 'auto', padding: '10px 12px' }}>
              {areaStats.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data</div>
              ) : areaStats.map((area, i) => {
                const rankColor = i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : i === 2 ? '#eab308' : '#6366f1';
                const isActive = activeArea === area.name;
                const topCat = Object.entries(area.categories).sort((a,b) => b[1]-a[1])[0];
                return (
                  <div key={area.name} className="hm-area-row" onClick={() => setActiveArea(isActive ? null : area.name)} style={{
                    padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                    background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.05)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `${rankColor}20`, border: `1px solid ${rankColor}40`,
                          fontSize: 11, fontWeight: 900, color: rankColor,
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{area.name}</span>
                      </div>
                      <div style={{ display: 'flex', align: 'center', gap: 6 }}>
                        {topCat && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 700,
                            background: `${CATEGORY_COLORS[topCat[0]] || '#94a3b8'}18`,
                            color: CATEGORY_COLORS[topCat[0]] || '#94a3b8',
                          }}>{CATEGORY_ICONS[topCat[0]]} {topCat[0]}</span>
                        )}
                        <span style={{ fontSize: 14, fontWeight: 900, color: area.pending > 0 ? '#f59e0b' : '#22c55e', minWidth: 20, textAlign: 'right' }}>
                          {area.total}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 5, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, transition: 'width 0.5s ease',
                        width: `${(area.total / maxTotal) * 100}%`,
                        background: `linear-gradient(90deg, ${rankColor}, ${rankColor}88)`,
                      }} />
                    </div>

                    <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                      <span style={{ color: '#f87171' }}>● {area.pending} open</span>
                      <span style={{ color: '#4ade80' }}>● {area.resolved} done</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {area.total > 0 ? Math.round((area.resolved / area.total) * 100) : 0}% resolved
                      </span>
                    </div>

                    {isActive && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Object.entries(area.categories).sort((a,b) => b[1]-a[1]).map(([cat, count]) => (
                          <span key={cat} style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: `${CATEGORY_COLORS[cat] || '#94a3b8'}15`,
                            color: CATEGORY_COLORS[cat] || '#94a3b8',
                            border: `1px solid ${CATEGORY_COLORS[cat] || '#94a3b8'}30`,
                          }}>
                            {CATEGORY_ICONS[cat]} {cat} ×{count}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category legend card */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              📂 Category Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                const count = filtered.filter(i => i.category === cat).length;
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80`, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                      {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 24, textAlign: 'right' }}>{count}</span>
                    <div style={{ width: 50, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / (filtered.length || 1)) * 100}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}