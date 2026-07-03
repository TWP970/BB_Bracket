// components/MultiStage/MultiStageView.jsx
import { useTournament } from '../../context/TournamentContext';
import { isGroupStageComplete } from '../../lib/multistage';
import RoundRobinView from '../RoundRobin/RoundRobinView';
import SwissView from '../Swiss/SwissView';
import BracketView from '../Bracket/BracketView';

export default function MultiStageView({ tournament }) {
  const { advanceKnockout } = useTournament();
  const { stage, groupTournaments, knockoutTournament, advancedPlayers, config, champion } = tournament;
  const canAdvance = isGroupStageComplete(tournament);

  return (
    <div className="multistage-view">
      {/* Stage Indicator */}
      <div className="bey-stage-indicator">
        <div className={`bey-stage-pill ${stage === 1 ? 'active' : 'done'}`}>
          {stage > 1 ? '✓' : '▶'} 第一階段：分組賽
        </div>
        <div className="bey-stage-arrow">→</div>
        <div className={`bey-stage-pill ${stage === 2 ? 'active' : stage < 2 ? 'pending' : 'done'}`}>
          {stage === 2 ? '▶' : ''} 第二階段：決賽圈
        </div>
      </div>

      {/* ── Stage 1: Group Stage ── */}
      {stage === 1 && (
        <div className="ms-groups">
          {groupTournaments.map((gt, idx) => (
            <div key={gt.groupId} className="bey-bracket-container" style={{ marginBottom: 20 }}>
              <div className="bey-group-header">
                <span className="bey-group-badge">{gt.groupName} 組</span>
                <span className="bey-group-sub">
                  {gt.format === 'roundrobin' ? '循環賽' : '瑞士制'} · {gt.tournament.players.length} 人
                </span>
              </div>
              <div style={{ padding: '0 12px 12px' }}>
                {gt.format === 'roundrobin'
                  ? <RoundRobinView tournament={gt.tournament} groupIdx={idx} advanceCount={config.advancePerGroup} />
                  : <SwissView tournament={gt.tournament} groupIdx={idx} advanceCount={config.advancePerGroup} />
                }
              </div>
            </div>
          ))}

          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button
              className={`btn-primary advance-btn ${!canAdvance ? 'btn-disabled' : ''}`}
              disabled={!canAdvance}
              onClick={advanceKnockout}
            >
              🚀 晉級至決賽圈（每組前 {config.advancePerGroup} 名）
            </button>
            {!canAdvance && (
              <p className="count-hint" style={{ marginTop: 8 }}>完成所有分組賽後可以晉級</p>
            )}
          </div>
        </div>
      )}

      {/* ── Stage 2: Knockout ── */}
      {stage === 2 && (
        <div className="ms-knockout">
          <div className="bey-bracket-container" style={{ marginBottom: 20 }}>
            <div className="bey-bracket-scroll" style={{ padding: '16px 20px' }}>
              <h3 className="bey-round-label" style={{ textAlign: 'center', marginBottom: 12 }}>
                ✅ 晉級名單 ({advancedPlayers.length} 人)
              </h3>
              <div className="bey-advanced-grid">
                {advancedPlayers.map(p => (
                  <div key={p.id} className="bey-advanced-chip">
                    <span className="bey-group-badge" style={{ fontSize: 10 }}>{p.fromGroup}</span>
                    {p.seed && <span className="bey-slot-num" style={{ width: 22, height: 22, fontSize: 10 }}>{p.seed}</span>}
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {knockoutTournament && <BracketView tournament={knockoutTournament} />}
          {champion && (
            <div className="bey-champion-display" style={{ margin: '20px auto', maxWidth: 300 }}>
              <div className="bey-champion-crown">👑</div>
              <div className="bey-champion-name">{champion.name}</div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>多階段賽制冠軍</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
