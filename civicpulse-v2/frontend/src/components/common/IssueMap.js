/**
 * IssueMap.js  –  Single-issue map with GPS + reverse geocode auto-fill
 *
 * Modes:
 *   picker=false  →  view-only map showing a pinned location
 *   picker=true   →  GPS button + click to pin + place search
 *                    onPick(lat, lng, geoData) where geoData = { address, area, ward, pincode }
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  @keyframes gps-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.7); }
    70%  { box-shadow: 0 0 0 10px rgba(99,102,241,0); }
    100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
  }
  .gps-pulsing { animation: gps-pulse 1s infinite; }
`;

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

function FlyTo({ lat, lng, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([parseFloat(lat), parseFloat(lng)], zoom, { duration: 0.7 });
  }, [lat, lng, zoom, map]);
  return null;
}

function ClickPicker({ onPick }) {
  useMapEvents({
    click(e) {
      if (onPick) onPick(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    },
  });
  return null;
}

// ── Reverse geocode lat/lng → address fields ──────────────────
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    const a    = data.address || {};

    // Build a readable street address
    const streetParts = [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean);
    const address = streetParts.join(' ') || data.display_name.split(',')[0];

    // Locality / area
    const area    = a.neighbourhood || a.suburb || a.village || a.town || a.city_district || '';
    const pincode = a.postcode || '';

    // ── Ward detection (3 layers) ──────────────────────────────
    // Layer 1: Nominatim fields
    let ward = a.quarter || a.borough || a['ISO3166-2-lvl8'] || '';

    // Layer 2: OpenStreetMap Overpass — KMC ward boundaries
    if (!ward) {
      try {
        const oq  = `[out:json][timeout:5];is_in(${lat},${lng});area._[admin_level~"^(9|10)$"][name];out;`;
        const or_ = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(oq)}`);
        const od  = await or_.json();
        const hit = (od.elements || []).find(e => e.tags?.name);
        if (hit) ward = hit.tags.name;
      } catch { /* overpass down — skip */ }
    }

    // Layer 3: Pincode → KMC ward number lookup (Kolkata-specific)
    if (!ward && pincode) {
      const W = {
        '700001':1,'700002':2,'700003':3,'700004':4,'700005':5,'700006':6,'700007':7,
        '700008':8,'700009':9,'700010':10,'700011':11,'700012':12,'700013':13,'700014':14,
        '700015':15,'700016':16,'700017':17,'700018':18,'700019':19,'700020':20,
        '700025':25,'700026':26,'700027':27,'700028':28,'700029':29,'700030':30,
        '700031':31,'700032':32,'700033':33,'700034':34,'700035':35,'700036':36,
        '700037':37,'700038':38,'700039':39,'700040':40,'700041':41,'700042':42,
        '700043':43,'700044':44,'700045':45,'700046':46,'700047':47,'700048':48,
        '700050':50,'700051':51,'700052':52,'700053':53,'700054':54,'700055':55,
        '700056':56,'700057':57,'700058':58,'700059':59,'700060':60,'700061':61,
        '700062':62,'700063':63,'700064':64,'700065':65,'700067':67,'700068':68,
        '700069':69,'700070':70,'700071':71,'700072':72,'700073':73,'700074':74,
        '700075':75,'700076':76,'700078':78,'700080':80,'700082':82,'700084':84,
        '700085':85,'700086':86,'700088':88,'700089':89,'700090':90,'700091':91,
        '700092':92,'700093':93,'700094':94,'700095':95,'700096':96,'700097':97,
        '700098':98,'700099':99,'700100':100,'700101':101,'700102':102,'700103':103,
        '700104':104,'700105':105,'700106':106,'700107':107,'700108':108,
        '700110':110,'700111':111,'700112':112,'700113':113,'700114':114,
      };
      if (W[pincode]) ward = `Ward ${W[pincode]}`;
    }

    return { address, area, ward, pincode };
  } catch {
    return {};
  }
}

// ── Main IssueMap ──────────────────────────────────────────────
export default function IssueMap({
  lat,
  lng,
  title   = 'Issue Location',
  address = '',
  color   = '#6366f1',
  height  = 300,
  picker  = false,
  onPick  = null,           // onPick(lat, lng, geoData)
}) {
  const [pinLat,    setPinLat]    = useState(lat || null);
  const [pinLng,    setPinLng]    = useState(lng || null);
  const [flyLat,    setFlyLat]    = useState(lat || null);
  const [flyLng,    setFlyLng]    = useState(lng || null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geoFilling, setGeoFilling] = useState(false);
  const [geoInfo,   setGeoInfo]   = useState(null); // last auto-filled result

  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop,  setShowDrop]  = useState(false);

  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);
  const KOLKATA     = [22.5726, 88.3639];

  useEffect(() => {
    if (lat && lng) {
      setPinLat(lat); setPinLng(lng);
      setFlyLat(lat); setFlyLng(lng);
    }
  }, [lat, lng]);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── After any pin drop, reverse geocode & call onPick with data ──
  const pinAndGeocode = useCallback(async (lt, ln, fromFly = false) => {
    setPinLat(lt); setPinLng(ln);
    if (fromFly) { setFlyLat(lt); setFlyLng(ln); }
    else         { setFlyLat(null); setFlyLng(null); }

    setGeoFilling(true);
    const geo = await reverseGeocode(lt, ln);
    setGeoInfo(geo);
    setGeoFilling(false);

    if (onPick) onPick(lt, ln, geo);
  }, [onPick]);

  // ── GPS button ────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lt = pos.coords.latitude.toFixed(6);
        const ln = pos.coords.longitude.toFixed(6);
        await pinAndGeocode(lt, ln, true);
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Map click ─────────────────────────────────────────────────
  const handleMapClick = (lt, ln) => pinAndGeocode(lt, ln, false);

  // ── Search ────────────────────────────────────────────────────
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

  const pickResult = async (result) => {
    const lt    = parseFloat(result.lat).toFixed(6);
    const ln    = parseFloat(result.lon).toFixed(6);
    const label = result.display_name.split(',').slice(0, 3).join(', ');
    setQuery(label);
    setShowDrop(false);
    await pinAndGeocode(lt, ln, true);
  };

  const hasCentre = flyLat && flyLng;
  const centre    = hasCentre ? [parseFloat(flyLat), parseFloat(flyLng)] : KOLKATA;

  if (!picker && !lat && !lng) return null;

  return (
    <div>
      <style>{MAP_STYLE}</style>

      {/* ── GPS + Search bar (picker only) ──────────────────── */}
      {picker && (
        <div style={{ marginBottom: 10 }}>

          {/* GPS button */}
          <button
            type="button"
            onClick={handleGPS}
            disabled={gpsLoading}
            className={gpsLoading ? 'btn btn-glass gps-pulsing' : 'btn btn-glass'}
            style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}
          >
            {gpsLoading
              ? <><div className="spinner-sm" style={{ width:14, height:14, borderTopColor:'#6366f1', borderColor:'rgba(99,102,241,0.2)', flexShrink:0 }} /> Getting GPS location…</>
              : <>📡 Use My GPS Location — auto-fills address, area, ward &amp; PIN</>
            }
          </button>

          {/* Auto-filled info banner */}
          {geoFilling && (
            <div style={{ fontSize:12, color:'#818cf8', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              <div className="spinner-sm" style={{ width:12, height:12, borderTopColor:'#818cf8', borderColor:'rgba(129,140,248,0.2)', flexShrink:0 }} />
              Looking up address from coordinates…
            </div>
          )}
          {geoInfo && !geoFilling && (
            <div style={{
              fontSize:12, marginBottom:8, padding:'8px 12px',
              background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)',
              borderRadius:8, display:'flex', flexWrap:'wrap', gap:'6px 16px'
            }}>
              {geoInfo.address  && <span>🏠 <strong>Address:</strong> {geoInfo.address}</span>}
              {geoInfo.area     && <span>🏘️ <strong>Area:</strong> {geoInfo.area}</span>}
              {geoInfo.ward     && <span>🗳️ <strong>Ward:</strong> {geoInfo.ward}</span>}
              {geoInfo.pincode  && <span>📮 <strong>PIN:</strong> {geoInfo.pincode}</span>}
              <span style={{ color:'#22c55e', fontWeight:700 }}>✅ Auto-filled!</span>
            </div>
          )}

          {/* Place search */}
          <div ref={wrapRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:15, pointerEvents:'none', zIndex:1 }}>🔍</span>
                <input
                  className="form-control"
                  style={{ paddingLeft: 36, paddingRight: query ? 34 : 14 }}
                  placeholder="Or search: Salt Lake, Park Street, Howrah…"
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
        </div>
      )}

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

      {/* ── Map ───────────────────────────────────────────────── */}
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
          {flyLat && flyLng && <FlyTo lat={flyLat} lng={flyLng} />}
          {picker && <ClickPicker onPick={handleMapClick} />}
          {pinLat && pinLng && (
            <Marker
              position={[parseFloat(pinLat), parseFloat(pinLng)]}
              icon={makePin(color)}
            />
          )}
        </MapContainer>
      </div>

      {/* View-only: coords + OSM link */}
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