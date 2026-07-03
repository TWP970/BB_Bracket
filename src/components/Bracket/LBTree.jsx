// components/Bracket/LBTree.jsx
// Losers Bracket renderer — column-based with SVG connector lines
// LB is NOT a balanced binary tree (drops alternate with consolidations),
// so we use an even vertical distribution per round + follow nextMatchId for connectors.
// Uses BeyMatchBox: click a player to advance, click again to withdraw.
import BeyMatchBox from './BeyMatchBox';

function getLBSizing(maxCount) {
  if (maxCount > 32) return { cardW: 130, cardH: 52, vGap: 8, hGap: 36 };
  if (maxCount > 16) return { cardW: 150, cardH: 56, vGap: 12, hGap: 44 };
  return { cardW: 180, cardH: 62, vGap: 24, hGap: 56 };
}

const PAD_X = 20;
const PAD_Y = 40;

export default function LBTree({ matches, lbRounds }) {
  if (!matches || lbRounds < 1) return null;

  const arr = Object.values(matches)
    .filter(m => m.bracket === 'losers')
    .sort((a, b) => a.round - b.round || a.position - b.position);

  if (arr.length === 0) return null;

  // Max matches in any LB round → determines total height
  const byRound = {};
  arr.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m); });
  const maxCount = Math.max(...Object.values(byRound).map(r => r.length));

  const { cardW, cardH, vGap, hGap } = getLBSizing(maxCount);
  const unit = cardH + vGap;

  const totalH  = maxCount * unit + PAD_Y + 20;
  const totalW  = PAD_X + lbRounds * (cardW + hGap) + 40;

  // Compute y for a match in a round: center within available vertical space
  function pos(round, position, countInRound) {
    const slot  = totalH - PAD_Y;
    const step  = slot / countInRound;
    const y     = PAD_Y + step * position + (step - cardH) / 2;
    const cy    = PAD_Y + step * position + step / 2;
    const x     = PAD_X + (round - 1) * (cardW + hGap);
    return { x, y, cx: x + cardW, cy, lx: x };
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
    const midX  = from.cx + hGap / 2;
    const color = m.winner ? '#8bc34a' : 'rgba(0,0,0,0.12)';

    return (
      <path
        key={`lbc-${m.id}`}
        d={`M ${from.cx} ${from.cy} L ${midX} ${from.cy} L ${midX} ${to.cy} L ${to.lx} ${to.cy}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
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
      <div key={`lbl-${r}`} className="bey-round-label" style={{
        position: 'absolute', top: 8, left: x, width: cardW,
        pointerEvents: 'none',
      }}>
        LB 第 {r} 輪
      </div>
    );
  });

  return (
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
          <div key={m.id} style={{ position: 'absolute', left: x, top: y, width: cardW }}>
            <BeyMatchBox match={m} />
          </div>
        );
      })}
    </div>
  );
}
