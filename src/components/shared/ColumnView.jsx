// components/shared/ColumnView.jsx
// Beyblade X style column bracket for RR / Swiss.
// Matches displayed as clean white cards on the light parchment background.
import { useState } from 'react';
import MatchCard from './MatchCard';
import ZoomPane from './ZoomPane';

const CARD_W = 220;
const CARD_H = 140;
const V_GAP = 14;
const H_GAP = 40;
const PAD_X = 20;
const PAD_Y = 44;
const ROW_H = CARD_H + V_GAP;

function ColCard({ match, extra = {} }) {
  return <MatchCard match={match} extra={extra} />;
}

function FlowConnectors({ rounds, totalW, totalH }) {
  const lines = [];
  for (let ri = 0; ri < rounds.length - 1; ri++) {
    const curCnt = rounds[ri].length;
    const nextCnt = rounds[ri + 1]?.length || 0;
    const maxCnt = Math.max(curCnt, nextCnt);
    if (maxCnt === 0) continue;

    const rx = PAD_X + ri * (CARD_W + H_GAP) + CARD_W;
    const nx = PAD_X + (ri + 1) * (CARD_W + H_GAP);
    const midX = (rx + nx) / 2;

    for (let mi = 0; mi < maxCnt; mi++) {
      if (mi < curCnt && mi < nextCnt) {
        const y = PAD_Y + mi * ROW_H + CARD_H / 2;
        lines.push(
          <path key={`${ri}-${mi}`}
            d={`M ${rx} ${y} L ${midX} ${y} L ${midX} ${y} L ${nx} ${y}`}
            fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        );
      }
    }
  }
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
      width={totalW} height={totalH}>
      {lines}
    </svg>
  );
}

// ── Full column view (small tournaments) ──────────────────────
function FullColumns({ rounds, labels, extra, footer }) {
  const maxM = Math.max(...rounds.map(r => r.length), 1);
  const totalH = maxM * ROW_H + PAD_Y + (footer ? 70 : 20);
  const totalW = rounds.length * (CARD_W + H_GAP) + PAD_X + 20;

  return (
    <ZoomPane>
      <div style={{ position: 'relative', width: totalW, height: totalH }}>
        <FlowConnectors rounds={rounds} totalW={totalW} totalH={totalH} />
          {rounds.map((rm, ri) => {
            const x = PAD_X + ri * (CARD_W + H_GAP);
            const label = labels?.[ri] ?? `第 ${ri + 1} 輪`;
            const done = rm.every(m => m.isCompleted);
            return (
              <div key={ri}>
                <div className="bey-round-label" style={{
                  position: 'absolute', top: 8, left: x, width: CARD_W,
                }}>
                  {label}{done && ' ✓'}
                </div>
                {rm.map((m, mi) => (
                  <div key={m.id} style={{
                    position: 'absolute', left: x, top: PAD_Y + mi * ROW_H, width: CARD_W,
                    contentVisibility: 'auto', containIntrinsicSize: `${CARD_W}px ${CARD_H}px`,
                  }}>
                    <ColCard match={m} extra={extra} />
                  </div>
                ))}
              </div>
            );
          })}
        {footer && (
          <div style={{ position: 'absolute', left: PAD_X, top: maxM * ROW_H + PAD_Y + 10, width: CARD_W * 1.4 }}>
            {footer}
          </div>
        )}
      </div>
    </ZoomPane>
  );
}

// ── Round navigator (large tournaments) ──────────────────────
function RoundNav({ rounds, labels, extra, footer }) {
  const [ri, setRi] = useState(0);
  const total = rounds.length;
  const cur = rounds[ri] ?? [];
  const label = labels?.[ri] ?? `第 ${ri + 1} 輪`;
  const done = cur.every(m => m.isCompleted);

  return (
    <div className="bey-bracket-container">
      <div className="bey-bracket-scroll" style={{ padding: '12px 20px 20px' }}>
        {/* Navigator bar */}
        <div className="bey-round-nav-bar">
          <button className="bey-round-nav-btn" onClick={() => setRi(r => Math.max(0, r - 1))} disabled={ri === 0}>‹ 上一輪</button>
          <div className="bey-round-nav-pills">
            {Array.from({ length: total }, (_, i) => (
              <button key={i} className={`bey-round-pill ${i === ri ? 'active' : ''}`} onClick={() => setRi(i)}>
                {i + 1}
              </button>
            ))}
          </div>
          <button className="bey-round-nav-btn" onClick={() => setRi(r => Math.min(total - 1, r + 1))} disabled={ri === total - 1}>下一輪 ›</button>
        </div>

        <div className="bey-round-label" style={{ textAlign: 'center', margin: '8px 0 12px' }}>
          {label} — {cur.length} 場 {done && <span className="bey-done-badge">✓ 完成</span>}
        </div>

        {/* Match grid */}
        <div className="bey-match-grid">
          {cur.map((m) => (
            <div key={m.id} className="bey-match-grid-item">
              <ColCard match={m} extra={extra} />
            </div>
          ))}
        </div>

        {footer && <div style={{ padding: '12px 0' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function ColumnView({ rounds, labels = [], extra = {}, footer = null }) {
  if (!rounds || rounds.length === 0) return null;

  const maxMatchesPerRound = Math.max(...rounds.map(r => r.length), 0);
  const useLarge = rounds.length > 5 || maxMatchesPerRound > 16;

  if (useLarge) {
    return <RoundNav rounds={rounds} labels={labels} extra={extra} footer={footer} />;
  }
  return <FullColumns rounds={rounds} labels={labels} extra={extra} footer={footer} />;
}
