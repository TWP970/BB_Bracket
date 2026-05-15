// components/shared/ColumnView.jsx
// Tree-style column bracket for RR / Swiss.
// Small (≤5 rounds, ≤16 matches/round): full columns + SVG flow connectors.
// Large: round-navigator with one round at a time.
import { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import MatchCard from './MatchCard';
import BracketCanvas from './BracketCanvas';

const CARD_W = 200;
const CARD_H = 155;
const V_GAP  = 20;
const H_GAP  = 60;
const PAD_X  = 20;
const PAD_Y  = 40;
const ROW_H  = CARD_H + V_GAP;

// ── Inline card (wraps shared MatchCard with extra prop) ──────
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
            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
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
  const maxM  = Math.max(...rounds.map(r => r.length), 1);
  const totalH = maxM * ROW_H + PAD_Y + (footer ? 70 : 20);
  const totalW = rounds.length * (CARD_W + H_GAP) + PAD_X + 20;

  return (
    <BracketCanvas contentW={totalW} contentH={totalH}>
      <FlowConnectors rounds={rounds} totalW={totalW} totalH={totalH} />

      {rounds.map((rm, ri) => {
        const x     = PAD_X + ri * (CARD_W + H_GAP);
        const label = labels?.[ri] ?? `第 ${ri + 1} 輪`;
        const done  = rm.every(m => m.isCompleted);
        return (
          <div key={ri}>
            <div style={{
              position:'absolute', top:4, left:x, width:CARD_W,
              textAlign:'center', fontSize:11, fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.07em',
              color: done ? 'var(--green)' : 'var(--text3)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:4,
            }}>
              {label}{done && ' ✓'}
            </div>
            {rm.map((m, mi) => (
              <div key={m.id} style={{
                position:'absolute', left:x, top: PAD_Y + mi * ROW_H, width:CARD_W,
                contentVisibility:'auto', containIntrinsicSize:`${CARD_W}px ${CARD_H}px`,
              }}>
                <ColCard match={m} extra={extra} />
              </div>
            ))}
          </div>
        );
      })}

      {footer && (
        <div style={{ position:'absolute', left:PAD_X, top: maxM * ROW_H + PAD_Y + 10, width: CARD_W * 1.4 }}>
          {footer}
        </div>
      )}
    </BracketCanvas>
  );
}

// ── Round navigator (large tournaments) ──────────────────────
function RoundNav({ rounds, labels, extra, footer }) {
  const [ri, setRi] = useState(0);
  const total = rounds.length;
  const cur   = rounds[ri] ?? [];
  const label = labels?.[ri] ?? `第 ${ri + 1} 輪`;
  const done  = cur.every(m => m.isCompleted);
  const totalH = cur.length * ROW_H + PAD_Y + 20;

  return (
    <div className="round-nav-wrapper">
      {/* Navigator bar */}
      <div className="round-nav-bar">
        <button className="round-nav-btn" onClick={() => setRi(r => Math.max(0, r-1))} disabled={ri === 0}>‹ 上一輪</button>
        <div className="round-nav-pills">
          {Array.from({ length: total }, (_, i) => (
            <button key={i} className={`round-pill ${i === ri ? 'active' : ''}`} onClick={() => setRi(i)}>
              {i + 1}
            </button>
          ))}
        </div>
        <button className="round-nav-btn" onClick={() => setRi(r => Math.min(total - 1, r+1))} disabled={ri === total - 1}>下一輪 ›</button>
      </div>

      <div className="round-nav-label">
        {label} — {cur.length} 場 {done && <span className="complete-badge badge" style={{marginLeft:6}}>✓ 完成</span>}
      </div>

      {/* Matches */}
      <div className="tree-bracket-scroll" style={{ maxHeight:'65vh' }}>
        <div style={{ position:'relative', width: CARD_W + PAD_X * 2, height: totalH, margin:'0 auto' }}>
          {cur.map((m, mi) => (
            <div key={m.id} style={{
              position:'absolute', left: PAD_X, top: PAD_Y + mi * ROW_H, width: CARD_W,
              contentVisibility:'auto', containIntrinsicSize:`${CARD_W}px ${CARD_H}px`,
            }}>
              <ColCard match={m} extra={extra} />
            </div>
          ))}
        </div>
      </div>

      {footer && <div style={{ padding:'12px 0' }}>{footer}</div>}
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
