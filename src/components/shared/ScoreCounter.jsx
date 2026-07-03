// components/shared/ScoreCounter.jsx
// BEYBLADE X style score counter panel (used by the judge page).
// Pick a match, tap finish buttons to add points; first to 4 wins and the
// score is sent via onScore(matchId, s1, s2). After a match ends the
// counter lets you pick the next one.
import { useState, useMemo } from 'react';

const TARGET = 4; // first to 4 points wins (BEYBLADE X rule)

const FINISHES = [
  { pts: 1, label: '旋轉' },
  { pts: 2, label: '場外' },
  { pts: 2, label: '爆裂' },
  { pts: 3, label: '極限' },
];

// Collect scoreable matches + the entry-number map (same numbering as
// the bracket badges: round-1 slot position*2+1 / *2+2).
function getScoreboard(t) {
  const empty = { matches: [], numberOf: {} };
  if (!t) return empty;
  const ko = t.type === 'multistage' ? t.knockoutTournament : t;
  if (!ko || (ko.type !== 'single' && ko.type !== 'double')) return empty;

  const all = Object.values(ko.matches);
  const numberOf = {};
  all
    .filter(m => m.bracket === 'winners' && m.round === 1)
    .forEach(m => {
      if (m.player1 && !m.player1.isBye) numberOf[m.player1.id] = m.position * 2 + 1;
      if (m.player2 && !m.player2.isBye) numberOf[m.player2.id] = m.position * 2 + 2;
    });

  const bracketOrder = { winners: 0, losers: 1, grand_final: 2 };
  const matches = all
    .filter(m =>
      !m.isCompleted && !m.isBye && !m.locked &&
      m.player1 && m.player2 && !m.player1.isBye && !m.player2.isBye)
    .sort((a, b) =>
      (bracketOrder[a.bracket] ?? 9) - (bracketOrder[b.bracket] ?? 9) ||
      a.round - b.round || a.position - b.position);

  return { matches, numberOf };
}

function matchLabel(m, numberOf) {
  const part = m.bracket === 'losers' ? '敗部 ' : m.bracket === 'grand_final' ? '大決賽 ' : '';
  const tag = m.bracket === 'grand_final' ? '' : `第 ${m.round} 輪 · `;
  const n = (p) => numberOf[p.id] != null ? `#${numberOf[p.id]} ` : '';
  return `${part}${tag}${n(m.player1)}${m.player1.name} vs ${n(m.player2)}${m.player2.name}`;
}

export default function ScoreCounterPanel({ tournament, onScore, resultNote = null }) {
  const { matches, numberOf } = useMemo(() => getScoreboard(tournament), [tournament]);

  // Snapshot of the selected pairing — the live match object disappears
  // from the ready list once the result is recorded, so render from this.
  const [game, setGame] = useState(null);
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [result, setResult] = useState(null);

  const pickMatch = (id) => {
    const m = matches.find(x => x.id === id) ?? null;
    setGame(m ? { matchId: m.id, player1: m.player1, player2: m.player2 } : null);
    setS1(0);
    setS2(0);
    setResult(null);
  };

  const addPoints = (side, pts) => {
    if (!game || result) return;
    const n1 = side === 1 ? s1 + pts : s1;
    const n2 = side === 2 ? s2 + pts : s2;
    setS1(n1);
    setS2(n2);
    if (n1 >= TARGET || n2 >= TARGET) {
      const winner = n1 >= TARGET ? game.player1 : game.player2;
      setResult({ winner, s1: n1, s2: n2 });
      onScore?.(game.matchId, n1, n2);
    }
  };

  const minus = (side) => {
    if (!game || result) return;
    if (side === 1) setS1(v => Math.max(0, v - 1));
    else setS2(v => Math.max(0, v - 1));
  };

  const renderSide = (player, score, side) => (
    <div className={`counter-side ${side === 1 ? 'p1' : 'p2'} ${result?.winner?.id === player.id ? 'won' : ''}`}>
      <div className="counter-side-head">
        {numberOf[player.id] != null && (
          <span className="counter-num">{numberOf[player.id]}</span>
        )}
        <span className="counter-name">{player.name}</span>
      </div>
      <div className="counter-score">{score}</div>
      <div className="counter-btns">
        {FINISHES.map((f, i) => (
          <button
            key={i}
            className="counter-btn"
            disabled={!!result}
            onClick={() => addPoints(side, f.pts)}
          >
            +{f.pts}
            <span className="counter-btn-sub">{f.label}</span>
          </button>
        ))}
      </div>
      <button className="counter-minus" disabled={!!result} onClick={() => minus(side)}>
        −1 修正
      </button>
    </div>
  );

  return (
    <div className="counter-panel">
      {/* Match selector */}
      <select
        className="sidebar-select counter-select"
        value={game?.matchId ?? ''}
        onChange={e => pickMatch(e.target.value)}
      >
        <option value="">— 選擇對戰組合 —</option>
        {matches.map(m => (
          <option key={m.id} value={m.id}>{matchLabel(m, numberOf)}</option>
        ))}
      </select>

      {!game && (
        <div className="counter-empty">
          {matches.length === 0
            ? '目前沒有可計分的對戰（僅淘汰賽制支援，且雙方選手須到位）'
            : '請先選擇一場對戰'}
        </div>
      )}

      {game && (
        <>
          <div className="counter-arena">
            {renderSide(game.player1, s1, 1)}
            <div className="counter-vs">VS</div>
            {renderSide(game.player2, s2, 2)}
          </div>

          {result ? (
            <div className="counter-result">
              <div className="counter-result-text">
                🏆 <strong>{result.winner.name}</strong> 以 {Math.max(result.s1, result.s2)} : {Math.min(result.s1, result.s2)} 獲勝！
                {resultNote && <div className="counter-result-note">{resultNote}</div>}
              </div>
              <button className="btn-primary counter-next-btn" onClick={() => pickMatch('')}>
                ⚡ 選擇下一場對戰
              </button>
            </div>
          ) : (
            <div className="counter-hint">先取得 {TARGET} 分者獲勝並自動晉級</div>
          )}
        </>
      )}
    </div>
  );
}
