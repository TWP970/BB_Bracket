// components/Bracket/TreeBracket.jsx
// Binary-tree bracket layout.
// For firstRoundCount > 32 → "round navigator" mode (prevents browser crash).
// For firstRoundCount ≤ 32 → full tree with SVG connectors.
import { useState } from 'react';
import MatchCard from '../shared/MatchCard';
import BracketCanvas from '../shared/BracketCanvas';

// ── Constants ─────────────────────────────────────────────────
const CARD_W  = 200;
const CARD_H  = 72;   // visual center math (player+vs section)
const V_GAP   = 88;   // space for confirm btn (~40px) + gap (~48px)
const H_GAP   = 68;
const PAD_X   = 20;
const PAD_Y   = 40;
const UNIT    = CARD_H + V_GAP; // 160px per match slot

// Compact card (for round-navigator list view)
const COMP_H  = 52;
const COMP_GAP = 8;
const COMP_ROW = COMP_H + COMP_GAP;

// ── Helpers ───────────────────────────────────────────────────
function matchPos(round, pos) {
  const centerY = (2 * pos + 1) * UNIT * Math.pow(2, round - 1) / 2;
  return {
    x:  PAD_X + (round - 1) * (CARD_W + H_GAP),
    y:  PAD_Y + centerY - CARD_H / 2,
    cx: PAD_X + (round - 1) * (CARD_W + H_GAP) + CARD_W,
    cy: PAD_Y + centerY,
    lx: PAD_X + (round - 1) * (CARD_W + H_GAP),
  };
}

function roundLabel(r, total) {
  if (r === total)     return '🏆 決賽';
  if (r === total - 1) return '準決賽';
  if (r === total - 2 && total > 3) return '八強';
  if (r === total - 3 && total > 4) return '十六強';
  return `第 ${r} 輪`;
}

// ── Compact match card (no score input, click to expand) ──────
function CompactCard({ match, onSelect }) {
  const { player1: p1, player2: p2, winner, isCompleted, isBye } = match;
  const nameOf = (p) => p ? (p.isBye ? 'BYE' : p.name) : 'TBD';
  return (
    <div
      className={`compact-match ${isCompleted ? 'completed' : ''} ${isBye ? 'bye' : ''}`}
      onClick={() => onSelect && onSelect(match)}
      title="點擊輸入比分"
    >
      <div className={`compact-player ${winner?.id === p1?.id ? 'winner' : ''}`}>
        {p1?.seed && <span className="seed-badge sm">{p1.seed}</span>}
        <span className="compact-name">{nameOf(p1)}</span>
        {isCompleted && <span className="compact-score">{match.score1}</span>}
      </div>
      <div className={`compact-player ${winner?.id === p2?.id ? 'winner' : ''}`}>
        {p2?.seed && <span className="seed-badge sm">{p2.seed}</span>}
        <span className="compact-name">{nameOf(p2)}</span>
        {isCompleted && <span className="compact-score">{match.score2}</span>}
      </div>
    </div>
  );
}

// ── Score modal for compact mode ──────────────────────────────
function ScoreModal({ match, bracketType, onClose }) {
  if (!match) return null;
  return (
    <div className="score-modal-overlay" onClick={onClose}>
      <div className="score-modal" onClick={e => e.stopPropagation()}>
        <div className="score-modal-title">輸入比分</div>
        <MatchCard match={match} bracketType={bracketType} />
        <button className="btn-secondary" style={{ marginTop: 12 }} onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}

// ── Round Navigator (large bracket mode) ─────────────────────
function RoundNavigator({ allMatches, rounds, bracketType }) {
  const [round, setRound]  = useState(rounds);        // start at final
  const [modal, setModal]  = useState(null);

  const matchesInRound = allMatches.filter(m => m.round === round)
    .sort((a, b) => a.position - b.position);

  const totalH = matchesInRound.length * COMP_ROW + 60;
  const isLargeRound = matchesInRound.length > 32;

  return (
    <div className="round-nav-wrapper">
      {/* Round selector */}
      <div className="round-nav-bar">
        <button className="round-nav-btn" onClick={() => setRound(r => Math.max(1, r - 1))} disabled={round <= 1}>‹ 上一輪</button>
        <div className="round-nav-pills">
          {Array.from({ length: rounds }, (_, i) => i + 1).map(r => (
            <button
              key={r}
              className={`round-pill ${r === round ? 'active' : ''}`}
              onClick={() => setRound(r)}
            >
              {r === rounds ? '🏆' : r === rounds - 1 ? 'SF' : r === rounds - 2 ? 'QF' : r}
            </button>
          ))}
        </div>
        <button className="round-nav-btn" onClick={() => setRound(r => Math.min(rounds, r + 1))} disabled={round >= rounds}>下一輪 ›</button>
      </div>

      <div className="round-nav-label">{roundLabel(round, rounds)} — {matchesInRound.length} 場</div>

      {/* Match list */}
      <div className="tree-bracket-scroll" style={{ maxHeight: '65vh' }}>
        <div style={{ position: 'relative', width: CARD_W + 40, height: totalH, margin: '0 auto' }}>
          {matchesInRound.map((m, i) => (
            <div
              key={m.id}
              style={{ position: 'absolute', left: 20, top: i * COMP_ROW, width: CARD_W,
                contentVisibility: 'auto', containIntrinsicSize: `${CARD_W}px ${COMP_H}px` }}
            >
              {isLargeRound
                ? <CompactCard match={m} onSelect={setModal} />
                : <MatchCard match={m} bracketType={bracketType} />
              }
            </div>
          ))}
        </div>
      </div>

      {modal && <ScoreModal match={modal} bracketType={bracketType} onClose={() => setModal(null)} />}
    </div>
  );
}

// ── Full Tree Bracket (≤ 32 matches in round 1) ───────────────
function FullTreeBracket({ allMatches, rounds, bracketType, champion }) {
  const arr = [...allMatches].sort((a, b) => a.round - b.round || a.position - b.position);
  const firstRoundCount = arr.filter(m => m.round === 1).length;

  const totalH = firstRoundCount * UNIT + PAD_Y + 20;
  const totalW = PAD_X + rounds * (CARD_W + H_GAP) + 40;

  const byId = Object.fromEntries(arr.map(m => [m.id, m]));

  const connectors = arr.map(m => {
    if (!m.nextMatchId) return null;
    const next = byId[m.nextMatchId];
    if (!next || next.bracket !== bracketType) return null;
    const from = matchPos(m.round, m.position);
    const to   = matchPos(next.round, next.position);
    const midX = from.cx + H_GAP / 2;
    return (
      <path key={`c-${m.id}`}
        d={`M ${from.cx} ${from.cy} L ${midX} ${from.cy} L ${midX} ${to.cy} L ${to.lx} ${to.cy}`}
        fill="none"
        stroke={m.winner ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.1)'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    );
  }).filter(Boolean);

  const labels = [];
  for (let r = 1; r <= rounds; r++) {
    const { x } = matchPos(r, 0);
    labels.push(
      <div key={`lbl-${r}`} style={{
        position: 'absolute', top: 4, left: x, width: CARD_W,
        textAlign: 'center', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text3)',
      }}>
        {roundLabel(r, rounds)}
      </div>
    );
  }

  return (
    <BracketCanvas contentW={totalW} contentH={totalH}>
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
        width={totalW} height={totalH}>
        {connectors}
      </svg>
      {labels}
      {arr.map(m => {
        const { x, y } = matchPos(m.round, m.position);
        return (
          <div key={m.id} style={{
            position: 'absolute', left: x, top: y, width: CARD_W,
            contentVisibility: 'auto',
            containIntrinsicSize: `${CARD_W}px 160px`,
          }}>
            <MatchCard match={m} bracketType={bracketType} />
          </div>
        );
      })}
      {champion && (() => {
        const { cx, cy } = matchPos(rounds, 0);
        return (
          <div style={{ position: 'absolute', left: cx + H_GAP / 2 - 60, top: cy - 48, width: 120, textAlign: 'center' }}>
            <div style={{ fontSize: 36 }}>👑</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--yellow)', marginTop: 4 }}>{champion.name}</div>
          </div>
        );
      })()}
    </BracketCanvas>
  );
}

// ── Public export ─────────────────────────────────────────────
export default function TreeBracket({ matches, rounds, bracketType = 'winners', champion = null }) {
  if (!matches || rounds < 1) return null;

  const arr = Object.values(matches).filter(m => m.bracket === bracketType);
  if (arr.length === 0) return null;

  const firstRoundCount = arr.filter(m => m.round === 1).length;

  // Large bracket: use round navigator instead of rendering all matches at once
  if (firstRoundCount > 32) {
    return <RoundNavigator allMatches={arr} rounds={rounds} bracketType={bracketType} />;
  }

  return <FullTreeBracket allMatches={arr} rounds={rounds} bracketType={bracketType} champion={champion} />;
}
