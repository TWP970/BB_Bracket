// components/RoundRobin/RRMatchRow.jsx
import { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';

export default function RRMatchRow({ match, groupIdx = null }) {
  const { submitScore } = useTournament();
  const [s1, setS1] = useState(match.score1 !== null ? String(match.score1) : '');
  const [s2, setS2] = useState(match.score2 !== null ? String(match.score2) : '');

  const handleConfirm = () => {
    const v1 = parseInt(s1, 10);
    const v2 = parseInt(s2, 10);
    if (isNaN(v1) || isNaN(v2) || v1 < 0 || v2 < 0) return;
    submitScore(match.id, v1, v2, groupIdx !== null ? { groupIdx } : {});
  };

  const p1Won = match.isCompleted && match.score1 > match.score2;
  const p2Won = match.isCompleted && match.score2 > match.score1;

  return (
    <div className={`rr-match-row ${match.isCompleted ? 'completed' : ''}`}>
      <div className={`rr-player-cell ${p1Won ? 'winner' : ''}`}>
        {match.player1.seed && <span className="seed-badge sm">{match.player1.seed}</span>}
        <span>{match.player1.name}</span>
      </div>

      <div className="rr-score-cell">
        <input
          className="score-input sm"
          type="number" min="0"
          value={s1}
          onChange={e => setS1(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="0"
        />
        <span className="score-sep">:</span>
        <input
          className="score-input sm"
          type="number" min="0"
          value={s2}
          onChange={e => setS2(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="0"
        />
        <button className="confirm-btn sm" onClick={handleConfirm}>✓</button>
      </div>

      <div className={`rr-player-cell right ${p2Won ? 'winner' : ''}`}>
        <span>{match.player2.name}</span>
        {match.player2.seed && <span className="seed-badge sm">{match.player2.seed}</span>}
      </div>
    </div>
  );
}
