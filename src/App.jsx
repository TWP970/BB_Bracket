// App.jsx
import { useState } from 'react';
import { useTournament } from './context/TournamentContext';
import Sidebar from './components/Sidebar/Sidebar';
import BracketView from './components/Bracket/BracketView';
import RoundRobinView from './components/RoundRobin/RoundRobinView';
import SwissView from './components/Swiss/SwissView';
import MultiStageView from './components/MultiStage/MultiStageView';
import SpectatorView from './components/Spectator/SpectatorView';
import ShareModal from './components/shared/ShareModal';
import Toast from './components/shared/Toast';

// ── Detect spectator mode via URL ────────────────────────────
const IS_SPECTATOR = new URLSearchParams(window.location.search).has('spectate');

// ── Tournament area (host mode) ───────────────────────────────
function TournamentArea() {
  const { state } = useTournament();
  const { tournament } = state;

  if (!tournament) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏆</div>
        <h2 className="empty-title">賽程表產生器</h2>
        <p className="empty-subtitle">在左側設定選手與賽制，然後點擊「產生賽程」</p>
        <div className="feature-pills">
          <span>🏹 單淘汰</span>
          <span>⚔️ 雙敗淘汰</span>
          <span>🔄 循環賽</span>
          <span>🇨🇭 瑞士制</span>
          <span>🏟️ 多階段</span>
        </div>
      </div>
    );
  }

  switch (tournament.type) {
    case 'single':
    case 'double':
      return <BracketView tournament={tournament} />;
    case 'roundrobin':
      return <RoundRobinView tournament={tournament} />;
    case 'grouped_rr':
      return (
        <div className="grouped-rr-view">
          {tournament.groupTournaments.map((gt, idx) => (
            <div key={gt.groupId} className="group-section-card">
              <div className="group-section-header">
                <span className="ms-group-badge">{gt.groupName} 組</span>
                <span className="ms-group-sub">循環賽 · {gt.players.length} 人</span>
              </div>
              <div style={{ padding: 12 }}>
                <RoundRobinView tournament={gt} groupIdx={idx} />
              </div>
            </div>
          ))}
        </div>
      );
    case 'swiss':
      return <SwissView tournament={tournament} />;
    case 'multistage':
      return <MultiStageView tournament={tournament} />;
    default:
      return null;
  }
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [showShare, setShowShare] = useState(false);
  const { state } = useTournament();

  // ── Spectator mode ──────────────────────────────────────────
  if (IS_SPECTATOR) {
    return <SpectatorView />;
  }

  // ── Host mode ───────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-icon">🏆</span>
          <span className="logo-text">BB Bracket</span>
          <span className="logo-sub">賽程表產生器</span>
        </div>
        <div className="header-badges">
          <span className="header-badge">最多 1000 人</span>
          <span className="header-badge">5 種賽制</span>
          <span className="header-badge">即時更新</span>
        </div>
        {/* Share button — only shown when a tournament is active */}
        {state.tournament && (
          <button
            className="share-btn-header"
            onClick={() => setShowShare(true)}
            title="分享即時觀戰連結"
          >
            📡 分享觀戰
          </button>
        )}
      </header>

      <div className="app-body">
        <Sidebar />
        <main className="main-area">
          <TournamentArea />
        </main>
      </div>

      <Toast />
      {showShare && (
        <ShareModal
          tournament={state.tournament}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
