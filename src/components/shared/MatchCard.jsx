// components/shared/MatchCard.jsx
import { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { useReadOnly } from '../../context/ReadOnlyContext';

export default function MatchCard({ match, extra = {}, bracketType = 'winners' }) {
  const { submitScore } = useTournament();
  const readOnly = useReadOnly();
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');

  if (!match) return null;

  const { player1: p1, player2: p2, isCompleted, isBye, winner, score1, score2 } = match;
  const canInput = !readOnly && !isCompleted && !isBye && p1 && !p1.isBye && p2 && !p2.isBye;

  const handleConfirm = () => {
    const v1 = parseInt(s1, 10);
    const v2 = parseInt(s2, 10);
    if (isNaN(v1) || isNaN(v2) || v1 < 0 || v2 < 0) return;
    submitScore(match.id, v1, v2, extra);
    setS1(''); setS2('');
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleConfirm(); };

  const labelClass = (p, score, otherScore) => {
    if (!isCompleted || !p || p.isBye) return '';
    if (winner?.id === p.id) return 'winner';
    return 'loser';
  };

  const bracketClass = bracketType === 'losers' ? 'match-card losers' : bracketType === 'grand_final' ? 'match-card grand-final' : 'match-card';

  return (
    <div className={`${bracketClass} ${isCompleted ? 'completed' : ''} ${isBye ? 'bye' : ''}`}>
      {/* Player 1 */}
      <div className={`match-player ${labelClass(p1, score1, score2)}`}>
        <div className="player-info">
          {p1?.seed && <span className="seed-badge">{p1.seed}</span>}
          <span className="player-name">
            {p1 ? (p1.isBye ? <span className="bye-text">BYE</span> : p1.name) : <span className="tbd">TBD</span>}
          </span>
          {p1?.fromGroup && <span className="group-tag">{p1.fromGroup}</span>}
        </div>
        {canInput
          ? <input className="score-input" type="number" min="0" value={s1} onChange={e => setS1(e.target.value)} onKeyDown={handleKey} placeholder="0" />
          : <span className="score-display">{isCompleted ? (score1 ?? '-') : ''}</span>
        }
      </div>

      <div className="match-vs">vs</div>

      {/* Player 2 */}
      <div className={`match-player ${labelClass(p2, score2, score1)}`}>
        <div className="player-info">
          {p2?.seed && <span className="seed-badge">{p2.seed}</span>}
          <span className="player-name">
            {p2 ? (p2.isBye ? <span className="bye-text">BYE</span> : p2.name) : <span className="tbd">TBD</span>}
          </span>
          {p2?.fromGroup && <span className="group-tag">{p2.fromGroup}</span>}
        </div>
        {canInput
          ? <input className="score-input" type="number" min="0" value={s2} onChange={e => setS2(e.target.value)} onKeyDown={handleKey} placeholder="0" />
          : <span className="score-display">{isCompleted ? (score2 ?? '-') : ''}</span>
        }
      </div>

      {canInput && (
        <button className="confirm-btn" onClick={handleConfirm}>確認</button>
      )}
    </div>
  );
}
