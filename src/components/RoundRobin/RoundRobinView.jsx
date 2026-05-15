// components/RoundRobin/RoundRobinView.jsx
import { useState } from 'react';
import { getSortedStandings } from '../../lib/roundrobin';
import StandingsTable from '../shared/StandingsTable';
import ColumnView from '../shared/ColumnView';

export default function RoundRobinView({ tournament, groupIdx = null, advanceCount = 0 }) {
  const [tab, setTab] = useState('bracket');

  const roundNums = [...new Set(tournament.matches.map(m => m.round))].sort((a, b) => a - b);
  const rounds = roundNums.map(r => tournament.matches.filter(m => m.round === r));
  const labels = roundNums.map(r => `第 ${r} 輪`);
  const extra  = groupIdx !== null ? { groupIdx } : {};
  const sorted = getSortedStandings(tournament);

  return (
    <div className="rr-view">
      <div className="view-tabs">
        <button className={`tab-btn ${tab === 'bracket' ? 'active' : ''}`} onClick={() => setTab('bracket')}>📅 樹狀賽程圖</button>
        <button className={`tab-btn ${tab === 'standings' ? 'active' : ''}`} onClick={() => setTab('standings')}>📊 積分榜</button>
      </div>

      {tab === 'bracket' && (
        <ColumnView rounds={rounds} labels={labels} extra={extra} />
      )}

      {tab === 'standings' && (
        <StandingsTable standings={sorted} mode="rr" showAdvance={advanceCount} />
      )}
    </div>
  );
}
