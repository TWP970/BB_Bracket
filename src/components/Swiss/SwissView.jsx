// components/Swiss/SwissView.jsx
import { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { getSortedSwissStandings, isSwissComplete } from '../../lib/swiss';
import StandingsTable from '../shared/StandingsTable';
import ColumnView from '../shared/ColumnView';

export default function SwissView({ tournament, groupIdx = null, advanceCount = 0 }) {
  const { nextSwissRound } = useTournament();
  const [tab, setTab] = useState('bracket');

  const sorted   = getSortedSwissStandings(tournament);
  const complete = isSwissComplete(tournament);

  const currentRoundDone = tournament.currentRound > 0 &&
    tournament.rounds[tournament.currentRound - 1]?.every(m => m.isCompleted);
  const canNext = currentRoundDone && tournament.currentRound < tournament.totalRounds && !complete;

  const extra  = groupIdx !== null ? { groupIdx } : {};
  const labels = tournament.rounds.map((_, i) => `第 ${i + 1} 輪`);

  // Rounds with bye matches: filter out byes for display or show them
  const rounds = tournament.rounds.map(r => r.filter(m => !m.isBye || true)); // show all incl byes

  const nextRoundBtn = canNext ? (
    <button
      className="btn-primary next-round-btn"
      style={{ maxWidth: 280 }}
      onClick={() => nextSwissRound(groupIdx)}
    >
      ⚡ 產生第 {tournament.currentRound + 1} 輪配對
    </button>
  ) : null;

  return (
    <div className="swiss-view">
      {/* Progress bar */}
      <div className="swiss-progress-bar">
        <div className="swiss-progress-track">
          <div
            className="swiss-progress-fill"
            style={{ width: `${Math.min((tournament.currentRound / tournament.totalRounds) * 100, 100)}%` }}
          />
        </div>
        <span className="swiss-progress-label">
          第 {tournament.currentRound} / {tournament.totalRounds} 輪
          {complete && <span className="badge complete-badge" style={{ marginLeft: 8 }}>✓ 賽事完畢</span>}
        </span>
      </div>

      <div className="view-tabs">
        <button className={`tab-btn ${tab === 'bracket' ? 'active' : ''}`} onClick={() => setTab('bracket')}>📅 樹狀賽程圖</button>
        <button className={`tab-btn ${tab === 'standings' ? 'active' : ''}`} onClick={() => setTab('standings')}>📊 排名</button>
      </div>

      {tab === 'bracket' && (
        <ColumnView
          rounds={rounds}
          labels={labels}
          extra={extra}
          footer={nextRoundBtn}
        />
      )}

      {tab === 'standings' && (
        <StandingsTable standings={sorted} mode="swiss" showAdvance={advanceCount} />
      )}
    </div>
  );
}
