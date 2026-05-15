// components/Spectator/SpectatorView.jsx
// Read-only live tournament view.
// Receives real-time updates via BroadcastChannel / localStorage.
import { useEffect } from 'react';
import { useBroadcastReceive, decodeState } from '../../hooks/useBroadcast';
import { ReadOnlyProvider } from '../../context/ReadOnlyContext';
import BracketView from '../Bracket/BracketView';
import RoundRobinView from '../RoundRobin/RoundRobinView';
import SwissView from '../Swiss/SwissView';
import MultiStageView from '../MultiStage/MultiStageView';

// ── Live indicator ────────────────────────────────────────────
function LiveBadge({ lastUpdate }) {
  const ago = lastUpdate
    ? Math.round((Date.now() - lastUpdate.getTime()) / 1000)
    : null;
  return (
    <div className="live-badge">
      <span className="live-dot" />
      LIVE
      {ago !== null && <span className="live-ago">· {ago < 5 ? '剛剛' : `${ago}s 前`}</span>}
    </div>
  );
}

// ── Read-only bracket renderer ────────────────────────────────
function ROBracket({ tournament }) {
  if (!tournament) {
    return (
      <div className="spectator-waiting">
        <div className="spectator-icon">📡</div>
        <div className="spectator-msg">等待賽事開始…</div>
        <div className="spectator-sub">主辦端產生賽程後將自動顯示</div>
      </div>
    );
  }

  // Same routing as App.jsx but inside ReadOnlyProvider (no inputs rendered)
  const inner = (() => {
    switch (tournament.type) {
      case 'single':
      case 'double':
        return <BracketView tournament={tournament} />;
      case 'roundrobin':
        return <RoundRobinView tournament={tournament} />;
      case 'swiss':
        return <SwissView tournament={tournament} />;
      case 'multistage':
        return <MultiStageView tournament={tournament} />;
      default:
        return null;
    }
  })();

  return <ReadOnlyProvider>{inner}</ReadOnlyProvider>;
}

// ── Main spectator page ───────────────────────────────────────
export default function SpectatorView() {
  // Try to get initial state from URL (?state=BASE64)
  const params   = new URLSearchParams(window.location.search);
  const encoded  = params.get('state');
  const roomCode = params.get('room');  // for Firebase cross-device sync
  const initial  = encoded ? decodeState(encoded) : null;

  const { tournament, lastUpdate, connected } = useBroadcastReceive(initial, roomCode);

  // Update page title
  useEffect(() => {
    document.title = '📡 BB Bracket — 即時觀戰';
  }, []);

  const formatName = tournament?.type
    ? { single:'單淘汰', double:'雙敗淘汰', roundrobin:'循環賽',
        grouped_rr:'分組循環', swiss:'瑞士制', multistage:'多階段' }[tournament.type] ?? ''
    : '';

  return (
    <div className="spectator-page">
      {/* Header */}
      <header className="spectator-header">
        <div className="spectator-title">
          <span className="spectator-trophy">🏆</span>
          <span className="spectator-name">BB Bracket</span>
          {formatName && <span className="spectator-format-tag">{formatName}</span>}
        </div>
        <LiveBadge lastUpdate={lastUpdate} />
      </header>

      {/* Bracket */}
      <div className="spectator-body">
        <ROBracket tournament={tournament} />
      </div>

      {/* Footer */}
      <div className="spectator-footer">
        觀戰模式 — 僅供觀看，無法修改賽程
      </div>
    </div>
  );
}
