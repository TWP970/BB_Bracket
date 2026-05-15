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
      <div className="stage-indicator">
        <div className={`stage-pill ${stage === 1 ? 'active' : 'done'}`}>
          {stage > 1 ? '✓' : '▶'} 第一階段：分組賽
        </div>
        <div className="stage-arrow">→</div>
        <div className={`stage-pill ${stage === 2 ? 'active' : stage < 2 ? 'pending' : 'done'}`}>
          {stage === 2 ? '▶' : ''} 第二階段：決賽圈
        </div>
      </div>

      {/* ── Stage 1: Group Stage ── */}
      {stage === 1 && (
        <div className="ms-groups">
          {groupTournaments.map((gt, idx) => (
            <div key={gt.groupId} className="ms-group-card">
              <div className="ms-group-header">
                <span className="ms-group-badge">{gt.groupName} 組</span>
                <span className="ms-group-sub">
                  {gt.format === 'roundrobin' ? '循環賽' : '瑞士制'} · {gt.tournament.players.length} 人
                </span>
              </div>
              <div className="ms-group-body">
                {gt.format === 'roundrobin'
                  ? <RoundRobinView tournament={gt.tournament} groupIdx={idx} advanceCount={config.advancePerGroup} />
                  : <SwissView tournament={gt.tournament} groupIdx={idx} advanceCount={config.advancePerGroup} />
                }
              </div>
            </div>
          ))}

          <div className="ms-advance-section">
            <button
              className={`btn-primary advance-btn ${!canAdvance ? 'btn-disabled' : ''}`}
              disabled={!canAdvance}
              onClick={advanceKnockout}
            >
              🚀 晉級至決賽圈（每組前 {config.advancePerGroup} 名）
            </button>
            {!canAdvance && (
              <p className="ms-hint">完成所有分組賽後可以晉級</p>
            )}
          </div>
        </div>
      )}

      {/* ── Stage 2: Knockout ── */}
      {stage === 2 && (
        <div className="ms-knockout">
          <div className="ms-advanced-section">
            <h3 className="section-title">✅ 晉級名單 ({advancedPlayers.length} 人)</h3>
            <div className="advanced-grid">
              {advancedPlayers.map(p => (
                <div key={p.id} className="advanced-chip">
                  <span className="group-tag">{p.fromGroup}</span>
                  {p.seed && <span className="seed-badge sm">{p.seed}</span>}
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
          {knockoutTournament && <BracketView tournament={knockoutTournament} />}
          {champion && (
            <div className="champion-banner">
              <div className="champion-crown">👑</div>
              <div className="champion-name">{champion.name}</div>
              <div className="champion-subtitle">多階段賽制冠軍</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
