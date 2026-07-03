// components/shared/ZoomPane.jsx
// Zoomable scroll pane for bracket views.
// Controls: − / % / ＋ / 適合寬度; ctrl(cmd)+wheel & trackpad pinch also zoom.
import { useState, useRef, useEffect, useLayoutEffect } from 'react';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const STEP = 0.15;

const clamp = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export default function ZoomPane({ children }) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const anchorRef = useRef(null);   // keeps the point under the cursor fixed while zooming
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Measure the unscaled content (offsetWidth/Height ignore transforms)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoomTo = (next, cx = null, cy = null) => {
    next = clamp(Math.round(next * 100) / 100);
    if (next === zoom) return;
    const sc = scrollRef.current;
    if (sc) {
      anchorRef.current = {
        px: cx ?? sc.clientWidth / 2,
        py: cy ?? sc.clientHeight / 2,
        prev: zoom,
      };
    }
    setZoom(next);
  };

  // After the zoom renders, shift scroll so the anchor point stays put
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    const a = anchorRef.current;
    if (!sc || !a) return;
    const ratio = zoom / a.prev;
    sc.scrollLeft = (sc.scrollLeft + a.px) * ratio - a.px;
    sc.scrollTop  = (sc.scrollTop  + a.py) * ratio - a.py;
    anchorRef.current = null;
  }, [zoom]);

  const fitWidth = () => {
    const sc = scrollRef.current;
    if (!sc || !size.w) return;
    const cs = getComputedStyle(sc);
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    // floor to 2 decimals so rounding never pushes content past the pane
    zoomTo(Math.floor(((sc.clientWidth - pad - 2) / size.w) * 100) / 100, 0, 0);
  };

  // ctrl/cmd + wheel zoom (native listener — React's wheel handler is passive)
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = sc.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomTo(zoom * factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    sc.addEventListener('wheel', onWheel, { passive: false });
    return () => sc.removeEventListener('wheel', onWheel);
  });

  return (
    <div className="bey-zoom-wrap">
      {/* Controls live outside the bracket frame so they never cover slots */}
      <div className="bey-zoom-controls">
        <button className="bey-zoom-btn" onClick={() => zoomTo(zoom - STEP)} title="縮小">−</button>
        <span
          className="bey-zoom-label"
          onClick={() => zoomTo(1)}
          title="點擊恢復 100%"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button className="bey-zoom-btn" onClick={() => zoomTo(zoom + STEP)} title="放大">＋</button>
        <button className="bey-zoom-btn bey-zoom-fit" onClick={fitWidth} title="縮放至容器寬度">適合寬度</button>
      </div>
      <div className="bey-bracket-container">
        <div className="bey-bracket-scroll" ref={scrollRef}>
          <div
            style={{
              width: size.w ? size.w * zoom : undefined,
              height: size.h ? size.h * zoom : undefined,
              overflow: 'hidden',
              marginInline: 'auto',
            }}
          >
            <div
              ref={contentRef}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'fit-content' }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
