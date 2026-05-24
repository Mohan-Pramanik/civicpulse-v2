import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const STYLE = `
  @keyframes ipmFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes ipmZoomIn {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
  }
  .ipm-root {
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ipmFadeIn 0.2s ease;
    overflow: hidden;
  }
  .ipm-img {
    max-width: 100vw;
    max-height: 100vh;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
    animation: ipmZoomIn 0.25s cubic-bezier(.22,.68,0,1.1);
    transition: opacity 0.2s ease;
    user-select: none;
    -webkit-user-drag: none;
  }
  .ipm-topbar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 56px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px;
    z-index: 10;
  }
  .ipm-counter {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255,255,255,0.9);
    letter-spacing: .06em;
    background: rgba(0,0,0,0.4);
    padding: 4px 14px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .ipm-close-btn {
    width: 38px; height: 38px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.2s;
    flex-shrink: 0;
  }
  .ipm-close-btn:hover {
    background: rgba(239,68,68,0.6);
    transform: rotate(90deg);
  }
  .ipm-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px; height: 48px;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.15);
    color: #fff;
    font-size: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.15s;
    z-index: 10;
    line-height: 1;
  }
  .ipm-arrow:hover { background: rgba(99,102,241,0.6); }
  .ipm-arrow.left  { left: 14px; }
  .ipm-arrow.right { right: 14px; }
  .ipm-arrow.left:hover  { transform: translateY(-50%) translateX(-2px); }
  .ipm-arrow.right:hover { transform: translateY(-50%) translateX(2px); }
  .ipm-bottombar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
    padding: 20px 16px 16px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
    z-index: 10;
  }
  .ipm-thumb {
    width: 50px; height: 42px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    flex-shrink: 0;
    transition: all 0.18s;
    opacity: 0.45;
  }
  .ipm-thumb:hover { opacity: 0.75; transform: translateY(-3px); }
  .ipm-thumb.active {
    border-color: #6366f1;
    opacity: 1;
    transform: translateY(-4px);
    box-shadow: 0 0 14px rgba(99,102,241,0.7);
  }
  .ipm-download {
    position: absolute;
    bottom: 18px; right: 18px;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 20px;
    padding: 6px 16px;
    font-size: 12px;
    color: rgba(255,255,255,0.65);
    text-decoration: none;
    transition: all 0.15s;
    z-index: 11;
  }
  .ipm-download:hover {
    background: rgba(255,255,255,0.15);
    color: #fff;
  }
  @media (max-width: 480px) {
    .ipm-arrow { width: 38px; height: 38px; font-size: 22px; }
    .ipm-arrow.left  { left: 6px; }
    .ipm-arrow.right { right: 6px; }
    .ipm-thumb { width: 38px; height: 32px; }
  }
`;

export default function ImagePreviewModal({ images, startIndex = 0, onClose }) {
  const [idx,    setIdx]    = useState(startIndex);
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  const go = useCallback((dir) => {
    setLoaded(false);
    setError(false);
    setIdx(i => (i + dir + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    // lock scroll on entire page
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const h = e => {
      if (e.key === 'ArrowLeft')  go(-1);
      if (e.key === 'ArrowRight') go(+1);
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', h);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', h);
    };
  }, [go, onClose]);

  useEffect(() => { setLoaded(false); setError(false); }, [idx]);

  const modal = (
    <>
      <style>{STYLE}</style>

      {/* Full-black backdrop, click to close */}
      <div className="ipm-root" onClick={onClose}>

        {/* Top bar */}
        <div className="ipm-topbar" onClick={e => e.stopPropagation()}>
          <div className="ipm-counter">{idx + 1} / {images.length}</div>
          <button className="ipm-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Spinner */}
        {!loaded && !error && (
          <div style={{ position:'absolute', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5 }}>
            <div className="spinner" style={{ width:46, height:46, borderTopColor:'#6366f1', borderColor:'rgba(99,102,241,0.15)' }} />
          </div>
        )}

        {/* Error */}
        {error ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, color:'rgba(255,255,255,0.5)', zIndex:5 }}
            onClick={e => e.stopPropagation()}>
            <span style={{ fontSize:64 }}>🖼️</span>
            <span style={{ fontSize:15 }}>Could not load image</span>
            <a href={images[idx]} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:13, color:'#818cf8', textDecoration:'none' }}>Open original ↗</a>
          </div>
        ) : (
          /* Image — stopPropagation so clicking image doesn't close */
          <img
            key={idx}
            src={images[idx]}
            alt={`photo ${idx + 1}`}
            className="ipm-img"
            style={{ opacity: loaded ? 1 : 0, zIndex: 5 }}
            onLoad={() => setLoaded(true)}
            onError={() => { setError(true); setLoaded(true); }}
            onClick={e => e.stopPropagation()}
          />
        )}

        {/* Arrows */}
        {images.length > 1 && <>
          <button className="ipm-arrow left"
            onClick={e => { e.stopPropagation(); go(-1); }}>‹</button>
          <button className="ipm-arrow right"
            onClick={e => { e.stopPropagation(); go(+1); }}>›</button>
        </>}

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="ipm-bottombar" onClick={e => e.stopPropagation()}>
            {images.map((src, i) => (
              <div key={i}
                className={`ipm-thumb ${i === idx ? 'active' : ''}`}
                onClick={() => { setLoaded(false); setError(false); setIdx(i); }}>
                <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              </div>
            ))}
          </div>
        )}

        {/* Download */}
        <a href={images[idx]} download target="_blank" rel="noopener noreferrer"
          className="ipm-download"
          style={{ bottom: images.length > 1 ? 76 : 18 }}
          onClick={e => e.stopPropagation()}>
          ⬇ Download
        </a>

      </div>
    </>
  );

  // Portal renders directly into document.body — completely outside sidebar/layout
  return createPortal(modal, document.body);
}