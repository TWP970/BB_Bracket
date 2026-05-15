// components/shared/StandingsTable.jsx
export default function StandingsTable({ standings, mode = 'rr', showAdvance = 0 }) {
  // mode: 'rr' | 'swiss'
  return (
    <div className="standings-wrapper">
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>選手</th>
            <th>勝</th>
            <th>平</th>
            <th>敗</th>
            {mode === 'swiss' && <th title="Buchholz tiebreaker">Buch.</th>}
            {mode === 'rr' && <><th>得分</th><th>失分</th><th>淨勝</th></>}
            <th>積分</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, idx) => {
            const gd = (s.goalsFor ?? 0) - (s.goalsAgainst ?? 0);
            const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
            const advanceClass = showAdvance > 0 && idx < showAdvance ? 'advancing' : '';
            return (
              <tr key={s.player.id} className={`${rankClass} ${advanceClass}`}>
                <td className="rank-cell">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </td>
                <td className="name-cell">
                  {s.player.seed && <span className="seed-badge sm">{s.player.seed}</span>}
                  {s.player.name}
                </td>
                <td>{s.wins}</td>
                <td>{s.draws}</td>
                <td>{s.losses}</td>
                {mode === 'swiss' && <td>{s.buchholz}</td>}
                {mode === 'rr' && (
                  <>
                    <td>{s.goalsFor ?? 0}</td>
                    <td>{s.goalsAgainst ?? 0}</td>
                    <td className={gd > 0 ? 'pos' : gd < 0 ? 'neg' : ''}>
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                  </>
                )}
                <td className="pts-cell">{s.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showAdvance > 0 && (
        <div className="advance-legend">
          <span className="advancing-dot" /> 晉級名額（前 {showAdvance} 名）
        </div>
      )}
    </div>
  );
}
