// components/Bracket/BeyMatchBox.jsx
// Compact click-to-advance match box (Beyblade X slot style).
// Used by the Losers Bracket & Grand Final so every bracket shares
// the same interaction: click a player to advance, click again to withdraw.
import { useTournament } from '../../context/TournamentContext';
import { useReadOnly } from '../../context/ReadOnlyContext';

export default function BeyMatchBox({ match }) {
  const { clickAdvance, clickWithdraw } = useTournament();
  const readOnly = useReadOnly();

  if (!match) return null;

  const bothReady = match.player1 && match.player2 &&
    !match.player1.isBye && !match.player2.isBye;

  const handleClick = (player) => {
    if (readOnly || match.isBye || match.locked || !player || player.isBye) return;
    if (match.isCompleted) {
      clickWithdraw(match.id);
    } else if (bothReady) {
      clickAdvance(match.id, player.id);
    }
  };

  const renderRow = (player) => {
    const isWinner = match.isCompleted && match.winner?.id === player?.id;
    const isLoser = match.isCompleted && player && !player.isBye && !isWinner;
    const canClick = !readOnly && !match.locked && player && !player.isBye && !match.isBye;
    const canAdvance = canClick && !match.isCompleted && bothReady;
    const canWithdraw = canClick && match.isCompleted;

    return (
      <div
        className={[
          'bey-mbox-row',
          isWinner && 'winner',
          isLoser && 'loser',
          canAdvance && 'clickable',
          canWithdraw && 'withdrawable',
          (!player || player.isBye) && 'empty',
        ].filter(Boolean).join(' ')}
        onClick={() => { if (canAdvance || canWithdraw) handleClick(player); }}
        title={canAdvance ? `點擊讓 ${player.name} 晉級` : canWithdraw ? '點擊撤回' : ''}
      >
        {player?.seed != null && <span className="bey-mbox-seed">{player.seed}</span>}
        <span className="bey-mbox-name">
          {!player ? 'TBD' : player.isBye ? 'BYE' : player.name}
        </span>
        {isWinner && <span className="bey-mbox-check">✓</span>}
      </div>
    );
  };

  return (
    <div className={`bey-mbox ${match.isCompleted ? 'completed' : ''} ${match.isBye ? 'bye' : ''}`}>
      {renderRow(match.player1)}
      {renderRow(match.player2)}
    </div>
  );
}
