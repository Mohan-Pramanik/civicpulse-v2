import React, { useState, useEffect } from 'react';

export default function ImagePreviewModal({ images, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
      if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: '1rem', animation: 'fadeIn 0.2s ease both' }}
      onClick={onClose}>

      {/* Close */}
      <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '50%', width: 40, height: 40, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
        onClick={onClose} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
        ✕
      </button>

      {/* Counter */}
      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--f-display)' }}>
        {idx + 1} / {images.length}
      </div>

      {/* Main image */}
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
        <img src={images[idx]} alt={`Evidence ${idx + 1}`}
          style={{ maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)', animation: 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }} />

        {images.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
              style={{ position: 'absolute', left: -60, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '50%', width: 48, height: 48, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>‹</button>
            <button onClick={() => setIdx(i => (i + 1) % images.length)}
              style={{ position: 'absolute', right: -60, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '50%', width: 48, height: 48, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>›</button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
          {images.map((img, i) => (
            <img key={i} src={img} alt={`thumb ${i}`} onClick={() => setIdx(i)}
              style={{ width: 64, height: 50, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', opacity: i === idx ? 1 : 0.4, border: `2px solid ${i === idx ? '#6366f1' : 'transparent'}`, transition: 'all 0.2s', boxShadow: i === idx ? '0 0 12px rgba(99,102,241,0.5)' : 'none' }} />
          ))}
        </div>
      )}
    </div>
  );
}