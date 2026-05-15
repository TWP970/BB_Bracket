// components/shared/BracketCanvas.jsx
// Auto-scales bracket content to fit the available container width.
// Vertical scroll still works via .main-area.
import { useRef, useState, useLayoutEffect } from 'react';

export default function BracketCanvas({ contentW, contentH, children }) {
  const containerRef = useRef(null);
  const [scale, setScale]   = useState(1);
  const [manual, setManual] = useState(null); // null = auto

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (manual !== null) return; // user overrode zoom — skip auto
      const avail = containerRef.current.clientWidth;
      if (avail > 0 && contentW > avail) {
        setScale(avail / contentW);
      } else {
        setScale(1);
      }
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [contentW, contentH, manual]);

  const activeScale = manual ?? scale;
  const scaledH = Math.ceil(contentH * activeScale);

  const zoomIn  = () => setManual(s => Math.min((s ?? scale) * 1.25, 2));
  const zoomOut = () => setManual(s => Math.max((s ?? scale) / 1.25, 0.05));
  const zoomFit = () => { setManual(null); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Zoom controls */}
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={zoomOut} title="縮小">－</button>
        <span className="zoom-label">{Math.round(activeScale * 100)}%</span>
        <button className="zoom-btn" onClick={zoomIn}  title="放大">＋</button>
        <button className="zoom-btn zoom-fit" onClick={zoomFit} title="適合寬度">⊡ 自動</button>
      </div>

      {/* Scaled canvas */}
      <div ref={containerRef} style={{ width: '100%', position: 'relative', height: scaledH, minHeight: 120 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: contentW, height: contentH,
          transformOrigin: 'top left',
          transform: `scale(${activeScale})`,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
