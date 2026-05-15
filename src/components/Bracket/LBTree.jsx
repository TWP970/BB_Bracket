// components/Bracket/LBTree.jsx
// Losers Bracket renderer — column-based with SVG connector lines
// LB is NOT a balanced binary tree (drops alternate with consolidations),
// so we use an even vertical distribution per round + follow nextMatchId for connectors.
import MatchCard from '../shared/MatchCard';

const CARD_W = 200;
const CARD_H = 72;
const V_GAP   = 88;
const H_GAP   = 68;
const PAD_X   = 20;
const PAD_Y   = 40;
const UNIT    = CARD_H + V_GAP;

export default function LBTree({ matches, lbRounds, wbRounds }) {
  if (!matches || lbRounds < 1) return null;

  const arr = Object.values(matches)
    .filter(m => m.bracket === 'losers')
    .sort((a, b) => a.round - b.round || a.position - b.position);

  if (arr.length === 0) return null;

  // Max matches in any LB round → determines total height
  const byRound = {};
  arr.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m); });
  const maxCount = Math.max(...Object.values(byRound).map(r => r.length));

  const totalH  = maxCount * UNIT + PAD_Y + 20;
  const totalW  = PAD_X + lbRounds * (CARD_W + H_GAP) + 40;

  // Compute y for a match in a round: center within available vertical space
  function pos(round, position, countInRound) {
    const slot  = totalH - PAD_Y;
    const step  = slot / countInRound;
    const y     = PAD_Y + step * position + (step - CARD_H) / 2;
    const cy    = PAD_Y + step * position + step / 2;
    const x     = PAD_X + (round - 1) * (CARD_W + H_GAP);
    return { x, y, cx: x + CARD_W, cy, lx: x };
  }

  // Pre-compute positions
  const posMap = {};
  arr.forEach(m => {
    const count = byRound[m.round].length;
    posMap[m.id] = pos(m.round, m.position, count);
  });

  // SVG connectors: follow nextMatchId within LB
  const connectors = arr.map(m => {
    if (!m.nextMatchId) return null;
    const nextM = arr.find(x => x.id === m.nextMatchId);
    if (!nextM) return null;

    const from  = posMap[m.id];
    const to    = posMap[nextM.id];
    const midX  = from.cx + H_GAP / 2;
    const color = m.winner ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)';

    return (
      <path
        key={`lbc-${m.id}`}
        d={`M ${from.cx} ${from.cy} L ${midX} ${from.cy} L ${midX} ${to.cy} L ${to.lx} ${to.cy}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }).filter(Boolean);

  // Round labels
  const labels = Object.keys(byRound).map(r => {
    const round = parseInt(r);
    const { x } = posMap[byRound[round][0].id];
    return (
      <div key={`lbl-${r}`} style={{
        position: 'absolute', top: 4, left: x, width: CARD_W,
        textAlign: 'center', fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        color: 'var(--text3)', pointerEvents: 'none',
      }}>
        LB 第 {r} 輪
      </div>
    );
  });

  return (
    <div className="tree-bracket-scroll">
      <div style={{ position: 'relative', width: totalW, height: totalH, minWidth: totalW }}>
        <svg
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
          width={totalW} height={totalH}
        >
          {connectors}
        </svg>
        {labels}
        {arr.map(m => {
          const { x, y } = posMap[m.id];
          return (
            <div key={m.id} style={{ position: 'absolute', left: x, top: y, width: CARD_W }}>
              <MatchCard match={m} bracketType="losers" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
