// App.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTournament } from './context/TournamentContext';
import Sidebar from './components/Sidebar/Sidebar';
import BracketView from './components/Bracket/BracketView';
import RoundRobinView from './components/RoundRobin/RoundRobinView';
import SwissView from './components/Swiss/SwissView';
import MultiStageView from './components/MultiStage/MultiStageView';
import SpectatorView from './components/Spectator/SpectatorView';
import ShareModal from './components/shared/ShareModal';
import JudgeView from './components/Judge/JudgeView';
import JudgeQRModal from './components/Judge/JudgeQRModal';
import Toast from './components/shared/Toast';

// ── Detect spectator / judge mode via URL ────────────────────
const URL_PARAMS = new URLSearchParams(window.location.search);
const IS_SPECTATOR = URL_PARAMS.has('spectate');
const IS_JUDGE = URL_PARAMS.has('judge');

// ── Swipe gesture config ─────────────────────────────────────
const SWIPE_THRESHOLD = 50;   // min px to count as swipe
const EDGE_ZONE = 30;         // px from left edge to start swipe

// ── Join another tournament by room code ─────────────────────
function JoinRoom() {
  const [code, setCode] = useState('');
  const canJoin = code.trim().length >= 4;

  const join = () => {
    if (!canJoin) return;
    const c = code.trim().toUpperCase();
    window.location.href = `${window.location.pathname}?spectate&room=${encodeURIComponent(c)}`;
  };

  return (
    <div className="join-room-card">
      <div className="join-room-title">📡 觀戰其他賽程</div>
      <div className="join-room-row">
        <input
          className="join-room-input"
          value={code}
          maxLength={6}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={e => e.key === 'Enter' && join()}
          placeholder="房間代碼"
          aria-label="輸入房間代碼"
        />
        <button className="btn-primary join-room-btn" onClick={join} disabled={!canJoin}>
          加入
        </button>
      </div>
      <div className="join-room-hint">輸入主辦方分享的 6 位代碼，即時觀看該賽程</div>
    </div>
  );
}

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
        <JoinRoom />
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
            <div key={gt.groupId} className="bey-bracket-container" style={{ marginBottom: 20 }}>
              <div className="bey-group-header">
                <span className="bey-group-badge">{gt.groupName} 組</span>
                <span className="bey-group-sub">循環賽 · {gt.players.length} 人</span>
              </div>
              <div style={{ padding: '0 12px 12px' }}>
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
  const [showCounter, setShowCounter] = useState(false);
  // Desktop starts expanded; phones (incl. landscape) start collapsed
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth > 768 && window.innerHeight > 520
  );
  const { state } = useTournament();
  const touchRef = useRef({ startX: 0, startY: 0 });

  // ── Swipe gesture handlers ─────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const t = e.changedTouches[0];
    const { startX, startY } = touchRef.current;
    const dx = t.clientX - startX;
    const dy = Math.abs(t.clientY - startY);

    // Only trigger if horizontal movement > threshold and > vertical movement
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > dy) {
      if (dx > 0 && startX < EDGE_ZONE && !sidebarOpen) {
        // Swipe right from left edge → open
        setSidebarOpen(true);
      } else if (dx < 0 && sidebarOpen) {
        // Swipe left while open → close
        setSidebarOpen(false);
      }
    }
  }, [sidebarOpen]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  // ── Judge mode (QR entrance) ────────────────────────────────
  if (IS_JUDGE) {
    return <JudgeView />;
  }

  // ── Spectator mode ──────────────────────────────────────────
  if (IS_SPECTATOR) {
    return <SpectatorView />;
  }

  // ── Host mode ───────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label="切換選單"
          >
            <span className={`hamburger-icon ${sidebarOpen ? 'open' : ''}`}>
              <span /><span /><span />
            </span>
          </button>
          <div className="header-logo">
            <span className="logo-icon">🏆</span>
            <span className="logo-text">BB Bracket</span>
            <span className="logo-sub">賽程表產生器</span>
          </div>
        </div>
        <div className="header-badges">
          <span className="header-badge">最多 1000 人</span>
          <span className="header-badge">5 種賽制</span>
          <span className="header-badge">即時更新</span>
        </div>
        {/* Action buttons — only shown when a tournament is active */}
        {state.tournament && (
          <div className="header-actions">
            <button
              className="share-btn-header"
              onClick={() => setShowCounter(true)}
              title="顯示裁判入口 QR Code"
            >
              🎯 裁判入口
            </button>
            <button
              className="share-btn-header"
              onClick={() => setShowShare(true)}
              title="分享即時觀戰連結"
            >
              📡 分享觀戰
            </button>
          </div>
        )}
      </header>

      <div className="app-body">
        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
      {showCounter && (
        <JudgeQRModal onClose={() => setShowCounter(false)} />
      )}
    </div>
  );
}
