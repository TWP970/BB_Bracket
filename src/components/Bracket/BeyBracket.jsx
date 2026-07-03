// components/Bracket/BeyBracket.jsx
// Beyblade X style symmetric bracket: left half vs right half converging to center.
// Click a player to advance them; click again on a completed match to withdraw.
import { useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { useReadOnly } from '../../context/ReadOnlyContext';
import ZoomPane from '../shared/ZoomPane';

// ── Sizing thresholds ────────────────────────────────────────
function getSizing(totalPlayers) {
  if (totalPlayers > 64) return { slotW: 110, slotH: 24, numW: 26, hGap: 20, vGap: 1, fontSize: 9 };
  if (totalPlayers > 32) return { slotW: 130, slotH: 28, numW: 28, hGap: 24, vGap: 2, fontSize: 10 };
  if (totalPlayers > 16) return { slotW: 150, slotH: 32, numW: 30, hGap: 28, vGap: 3, fontSize: 11 };
  return { slotW: 180, slotH: 38, numW: 34, hGap: 32, vGap: 4, fontSize: 13 };
}

export default function BeyBracket({ tournament }) {
  const { clickAdvance, clickWithdraw } = useTournament();
  const readOnly = useReadOnly();

  const { matches, rounds, champion } = tournament;

  // All winners bracket matches sorted
  const allMatches = useMemo(() =>
    Object.values(matches || {})
      .filter(m => m.bracket === 'winners')
      .sort((a, b) => a.round - b.round || a.position - b.position),
    [matches]
  );

  const r1Matches = allMatches.filter(m => m.round === 1);
  const r1Count = r1Matches.length;
  const totalPlayers = r1Count * 2;
  const halfMatches = Math.ceil(r1Count / 2); // matches per side in round 1

  const sz = getSizing(totalPlayers);

  // ── Group by round ──────────────────────────────────────────
  const byRound = useMemo(() => {
    const map = {};
    allMatches.forEach(m => {
      (map[m.round] = map[m.round] || []).push(m);
    });
    return map;
  }, [allMatches]);

  // ── Assign each match to a side ─────────────────────────────
  // Left = positions 0..half-1; Right = positions half..end
  // We trace upwards: if a match feeds into a "center" (final), it remains on its side.
  const sideOf = useMemo(() => {
    const sides = {};
    
    // Start from round 1: first half left, second half right
    for (let r = 1; r <= rounds; r++) {
      const rm = byRound[r] || [];
      const count = rm.length;
      if (count === 1 && r === rounds) {
        sides[rm[0].id] = 'center'; // final match
      } else {
        const half = Math.ceil(count / 2);
        rm.forEach((m, i) => {
          sides[m.id] = i < half ? 'left' : 'right';
        });
      }
    }
    return sides;
  }, [byRound, rounds]);

  // ── Compute local position within each side's round ─────────
  const localPos = useMemo(() => {
    const lp = {};
    for (let r = 1; r <= rounds; r++) {
      const rm = byRound[r] || [];
      let leftIdx = 0, rightIdx = 0;
      rm.forEach(m => {
        const side = sideOf[m.id];
        if (side === 'left') { lp[m.id] = leftIdx++; }
        else if (side === 'right') { lp[m.id] = rightIdx++; }
        else { lp[m.id] = 0; }
      });
    }
    return lp;
  }, [byRound, sideOf, rounds]);

  // Count matches per side per round
  const sideRoundCount = useMemo(() => {
    const counts = {};
    for (let r = 1; r <= rounds; r++) {
      const rm = byRound[r] || [];
      let left = 0, right = 0;
      rm.forEach(m => {
        if (sideOf[m.id] === 'left') left++;
        else if (sideOf[m.id] === 'right') right++;
      });
      counts[r] = { left, right };
    }
    return counts;
  }, [byRound, sideOf, rounds]);

  // ── Y positioning ───────────────────────────────────────────
  // Each match occupies 2 slots vertically. Spacing increases with round depth.
  const sideHeight = halfMatches * 2 * (sz.slotH + sz.vGap) + 40;

  function getMatchCenterY(side, round, lPos) {
    const count = sideRoundCount[round]?.[side] || 1;
    const availH = sideHeight - 40;
    const spacing = availH / count;
    return 20 + spacing * lPos + spacing / 2;
  }

  // ── X positioning ───────────────────────────────────────────
  // Left side: round 1 at x=0, increasing rounds go right (toward center)
  // Right side: round 1 flush at x=max, increasing rounds go left (toward center)
  const colW = sz.slotW + sz.numW + sz.hGap;
  // How many columns per side? = rounds - 1 (final is in center)
  const sideCols = Math.max(rounds - 1, 1);
  // Last column ends after its slot; keep one hGap for the connector to center
  const sideWidth = (sideCols - 1) * colW + sz.slotW + sz.numW + sz.hGap;

  // Box width per round: only round 1 carries the number badge
  const boxW = (round) => round === 1 ? sz.numW + sz.slotW : sz.slotW;

  function getMatchX(side, round) {
    const roundIdx = round - 1;
    if (side === 'left') {
      return roundIdx * colW;
    } else {
      // Mirror: box right edge sits at sideWidth - roundIdx * colW
      return sideWidth - roundIdx * colW - boxW(round);
    }
  }

  // ── Click handler ───────────────────────────────────────────
  const handleClick = (match, playerId) => {
    if (readOnly || match.isBye) return;
    if (match.isCompleted) {
      clickWithdraw(match.id);
    } else if (match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye) {
      clickAdvance(match.id, playerId);
    }
  };

  const nameOf = (p) => !p ? '' : p.isBye ? 'BYE' : p.name;

  // ── Render one side ─────────────────────────────────────────
  function renderSide(side) {
    const isLeft = side === 'left';
    const sideMatches = allMatches.filter(m => sideOf[m.id] === side);
    const elements = [];
    const paths = [];

    sideMatches.forEach(m => {
      const round = m.round;
      const lPos = localPos[m.id];
      const cy = getMatchCenterY(side, round, lPos);
      const x = getMatchX(side, round);

      const y1 = cy - sz.slotH - sz.vGap / 2;
      const y2 = cy + sz.vGap / 2;

      // Compute the global player number for round 1 badges
      let num1 = null, num2 = null;
      if (round === 1) {
        if (isLeft) {
          num1 = lPos * 2 + 1;
          num2 = lPos * 2 + 2;
        } else {
          num1 = halfMatches * 2 + lPos * 2 + 1;
          num2 = halfMatches * 2 + lPos * 2 + 2;
        }
      }

      elements.push(renderSlot(m, m.player1, 1, x, y1, isLeft, num1));
      elements.push(renderSlot(m, m.player2, 2, x, y2, isLeft, num2));

      // ── Connector to next match ──
      if (m.nextMatchId && sideOf[m.nextMatchId] === side) {
        const nextM = matches[m.nextMatchId];
        if (!nextM) return;
        const nextCy = getMatchCenterY(side, nextM.round, localPos[m.nextMatchId]);
        const nextX = getMatchX(side, nextM.round);

        const nextSlotY = m.nextMatchSlot === 1
          ? nextCy - sz.slotH - sz.vGap / 2 + sz.slotH / 2
          : nextCy + sz.vGap / 2 + sz.slotH / 2;

        let fromX, toX;
        if (isLeft) {
          fromX = x + boxW(round);          // parent box right edge
          toX = nextX;                       // child box left edge
        } else {
          fromX = x;                         // parent box left edge
          toX = nextX + boxW(nextM.round);   // child box right edge
        }

        const midX = (fromX + toX) / 2;
        const color = m.isCompleted ? '#8bc34a' : 'rgba(0,0,0,0.12)';

        paths.push(
          <path
            key={`c-${m.id}`}
            d={`M ${fromX} ${cy} L ${midX} ${cy} L ${midX} ${nextSlotY} L ${toX} ${nextSlotY}`}
            fill="none" stroke={color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          />
        );
      }

      // ── Connector to center (final) ──
      if (m.nextMatchId && sideOf[m.nextMatchId] === 'center') {
        const fromX = isLeft ? x + boxW(round) : x;
        const color = m.isCompleted ? '#8bc34a' : 'rgba(0,0,0,0.12)';

        paths.push(
          <path
            key={`ctr-${m.id}`}
            d={`M ${fromX} ${cy} L ${isLeft ? fromX + sz.hGap : fromX - sz.hGap} ${cy}`}
            fill="none" stroke={color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          />
        );
      }
    });

    return { elements, paths };
  }

  // ── Render player slot ──────────────────────────────────────
  function renderSlot(match, player, slotNum, x, y, isLeft, globalNum) {
    const isWinner = match.isCompleted && match.winner?.id === player?.id;
    const isLoser = match.isCompleted && player && !player.isBye && match.winner?.id !== player?.id;
    const canClick = !readOnly && player && !player.isBye && !match.isBye;
    const canAdvance = canClick && !match.isCompleted && match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye;
    const canWithdraw = canClick && match.isCompleted;

    const badge = globalNum !== null ? (
      <div className="bey-slot-num" style={{ width: sz.numW, height: sz.slotH, fontSize: sz.fontSize - 1 }}>
        {globalNum}
      </div>
    ) : null;

    const name = (
      <div
        className={[
          'bey-slot-name',
          isWinner && 'winner',
          isLoser && 'loser',
          canAdvance && 'clickable',
          canWithdraw && 'withdrawable',
          (!player || player.isBye) && 'empty',
        ].filter(Boolean).join(' ')}
        style={{ width: sz.slotW, height: sz.slotH, fontSize: sz.fontSize, lineHeight: `${sz.slotH}px` }}
        onClick={() => {
          if (canAdvance || canWithdraw) handleClick(match, player?.id);
        }}
        title={canAdvance ? `點擊讓 ${nameOf(player)} 晉級` : canWithdraw ? '點擊撤回' : ''}
      >
        {nameOf(player) || '\u00A0'}
      </div>
    );

    return (
      <div
        key={`s-${match.id}-${slotNum}`}
        className="bey-slot"
        style={{
          position: 'absolute', left: x, top: y,
          display: 'flex', flexDirection: isLeft ? 'row' : 'row-reverse',
        }}
      >
        {badge}
        {name}
      </div>
    );
  }

  // ── Render center finals ────────────────────────────────────
  function renderFinals() {
    const finalMatch = (byRound[rounds] || [])[0];
    if (!finalMatch) return null;

    // Try to find semifinal losers for 3rd/4th
    const semis = byRound[rounds - 1] || [];
    const semiLosers = semis.filter(m => m.isCompleted && m.loser).map(m => m.loser);

    return (
      <div className="bey-finals-area">
        <div className="bey-trophy">
          <div className="bey-trophy-icon">🏆</div>
          <div className="bey-trophy-title">TOURNAMENT</div>
          <div className="bey-trophy-subtitle">WINNER</div>
        </div>

        {champion && (
          <div className="bey-champion-display">
            <div className="bey-champion-crown">👑</div>
            <div className="bey-champion-name">{champion.name}</div>
          </div>
        )}

        <div className="bey-final-match">
          <div className="bey-final-label">決賽</div>
          <div className="bey-final-slots">
            {renderFinalPlayer(finalMatch, finalMatch.player1)}
            <span className="bey-final-vs">VS</span>
            {renderFinalPlayer(finalMatch, finalMatch.player2)}
          </div>
        </div>

        <div className="bey-rankings">
          {[
            { rank: '1st', player: champion },
            { rank: '2nd', player: finalMatch.isCompleted ? finalMatch.loser : null },
            { rank: '3rd', player: semiLosers[0] || null },
            { rank: '4th', player: semiLosers[1] || null },
          ].map(({ rank, player }) => (
            <div key={rank} className="bey-rank-row">
              <div className="bey-rank-badge">{rank}</div>
              <div className="bey-rank-name">{player ? player.name : ''}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderFinalPlayer(match, player) {
    const isWinner = match.isCompleted && match.winner?.id === player?.id;
    const canClick = !readOnly && player && !player.isBye && !match.isBye;
    const canAdvance = canClick && !match.isCompleted && match.player1 && match.player2;
    const canWithdraw = canClick && match.isCompleted;

    return (
      <div
        className={[
          'bey-final-player',
          isWinner && 'winner',
          canAdvance && 'clickable',
          canWithdraw && 'withdrawable',
        ].filter(Boolean).join(' ')}
        onClick={() => {
          if (canAdvance || canWithdraw) handleClick(match, player?.id);
        }}
        title={canAdvance ? `點擊讓 ${nameOf(player)} 獲勝` : canWithdraw ? '點擊撤回' : ''}
      >
        {nameOf(player) || 'TBD'}
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────
  if (!matches || rounds < 1) return null;

  const leftData = renderSide('left');
  const rightData = renderSide('right');
  const centerWidth = 300;
  const totalWidth = sideWidth + centerWidth + sideWidth + 40;

  return (
    <ZoomPane>
      <div className="bey-bracket-inner" style={{ width: totalWidth, minWidth: totalWidth }}>
          {/* Left bracket */}
          <div className="bey-side bey-side-left" style={{ width: sideWidth, height: sideHeight, position: 'relative' }}>
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
              width={sideWidth} height={sideHeight}>
              {leftData.paths}
            </svg>
            {leftData.elements}
          </div>

          {/* Center area */}
          <div className="bey-center" style={{ width: centerWidth, minHeight: sideHeight }}>
            {renderFinals()}
          </div>

          {/* Right bracket */}
          <div className="bey-side bey-side-right" style={{ width: sideWidth, height: sideHeight, position: 'relative' }}>
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
              width={sideWidth} height={sideHeight}>
              {rightData.paths}
            </svg>
            {rightData.elements}
        </div>
      </div>
    </ZoomPane>
  );
}
