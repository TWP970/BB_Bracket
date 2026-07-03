// components/Judge/JudgeView.jsx
// Standalone judge page (?judge=1&room=CODE), entered by scanning the
// QR code from the host's 裁判入口. Receives the live tournament via the
// room and pushes score commands back to the host, which applies them
// and advances the bracket.
import { useEffect } from 'react';
import { useBroadcastReceive, sendJudgeCommand } from '../../hooks/useBroadcast';
import { firebaseReady } from '../../lib/firebase';
import ScoreCounterPanel from '../shared/ScoreCounter';

export default function JudgeView() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = (params.get('room') || '').toUpperCase();

  const { tournament, lastUpdate } = useBroadcastReceive(null, roomCode);

  useEffect(() => {
    document.title = '🎯 BB Bracket — 裁判計分';
  }, []);

  const onScore = (matchId, s1, s2) => sendJudgeCommand(roomCode, matchId, s1, s2);

  const body = (() => {
    if (!firebaseReady || !roomCode) {
      return (
        <div className="spectator-waiting">
          <div className="spectator-icon">⚠️</div>
          <div className="spectator-msg">無法連線</div>
          <div className="spectator-sub">
            {!roomCode ? '缺少房間代碼，請重新掃描主辦端的裁判 QR Code' : '雲端同步未設定，無法使用裁判模式'}
          </div>
        </div>
      );
    }
    if (!tournament) {
      return (
        <div className="spectator-waiting">
          <div className="spectator-icon">📡</div>
          <div className="spectator-msg">連線中…</div>
          <div className="spectator-sub">等待主辦端賽程資料（房間 {roomCode}）</div>
        </div>
      );
    }
    return (
      <div className="judge-panel-wrap">
        <ScoreCounterPanel
          tournament={tournament}
          onScore={onScore}
          resultNote="比分已回傳主辦端，賽程將自動晉級"
        />
      </div>
    );
  })();

  return (
    <div className="spectator-page">
      <header className="spectator-header">
        <div className="spectator-title">
          <span className="spectator-trophy">🎯</span>
          <span className="spectator-name">裁判計分</span>
          {roomCode && <span className="spectator-format-tag">房間 {roomCode}</span>}
        </div>
        {tournament && (
          <div className="live-badge">
            <span className="live-dot" />
            已連線
            {lastUpdate && (
              <span className="live-ago">
                · {Math.round((Date.now() - lastUpdate.getTime()) / 1000) < 5 ? '剛剛' : '同步中'}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="spectator-body judge-body">{body}</div>

      <div className="spectator-footer">
        裁判模式 — 計分結果即時同步至主辦端並自動晉級
      </div>
    </div>
  );
}
