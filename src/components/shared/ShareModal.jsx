// components/shared/ShareModal.jsx
import { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { encodeState } from '../../hooks/useBroadcast';
import { firebaseReady as fbReady } from '../../lib/firebase';

export default function ShareModal({ tournament, onClose }) {
  const { roomCode } = useTournament();
  const [copied, setCopied] = useState('');

  const base      = window.location.origin + window.location.pathname;
  // Cross-device URL: room code only (Firebase) or snapshot (fallback)
  const liveUrl   = `${base}?spectate=1`;
  const roomUrl   = `${base}?spectate=1&room=${roomCode}`;
  const encoded   = encodeState(tournament);
  const snapUrl   = encoded ? `${base}?spectate=1&state=${encoded}` : null;
  const snapSize  = snapUrl?.length ?? 0;
  const snapOk    = snapSize < 8000;

  const copy = async (url, key) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied(''), 2500);
    } catch {
      prompt('複製以下連結：', url);
    }
  };

  const openSpectator = (url) => window.open(url, '_blank', 'noopener');

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>

        <div className="share-header">
          <span className="share-title">📡 分享即時觀戰</span>
          <button className="share-close" onClick={onClose}>✕</button>
        </div>

        {/* Room code display */}
        <div className="room-code-box">
          <div className="room-code-label">房間代碼</div>
          <div className="room-code">{roomCode}</div>
          <div className="room-code-hint">觀戰者輸入此代碼即可加入</div>
        </div>

        {/* ── Option 1: Same device (always works) ── */}
        <div className="share-option">
          <div className="share-option-label">
            <span className="share-badge local">同裝置</span>
            在同一瀏覽器新分頁即時觀看
          </div>
          <div className="share-row">
            <button className="btn-primary share-action-btn" onClick={() => openSpectator(liveUrl)}>
              📺 開啟觀戰分頁
            </button>
            <button className={`share-copy-btn ${copied === 'live' ? 'copied' : ''}`} onClick={() => copy(liveUrl, 'live')}>
              {copied === 'live' ? '✓ 已複製' : '複製連結'}
            </button>
          </div>
          <div className="share-hint">⚡ BroadcastChannel 即時同步，延遲 &lt;100ms</div>
        </div>

        {/* ── Option 2: Cross-device via Firebase ── */}
        <div className="share-option">
          <div className="share-option-label">
            <span className="share-badge remote">跨裝置</span>
            {fbReady ? '透過雲端即時同步' : '⚠️ 需設定雲端同步（見下方說明）'}
          </div>
          {fbReady ? (
            <>
              <div className="share-row">
                <button className="btn-primary share-action-btn" onClick={() => openSpectator(roomUrl)}>
                  🌐 跨裝置觀看
                </button>
                <button className={`share-copy-btn ${copied === 'room' ? 'copied' : ''}`} onClick={() => copy(roomUrl, 'room')}>
                  {copied === 'room' ? '✓ 已複製' : '複製連結'}
                </button>
              </div>
              <div className="share-hint">🔴 LIVE — 每次比分更新後 &lt;500ms 全球同步</div>
            </>
          ) : (
            <div className="share-warn">
              雲端同步尚未設定。請複製 <code>.env.example</code> 為 <code>.env.local</code>，
              填入憑證後重啟伺服器即可啟用跨裝置即時同步。
            </div>
          )}
        </div>

        {/* ── Option 3: URL snapshot (fallback) ── */}
        <div className="share-option share-option-slim">
          <span className="share-hint" style={{ flex: 1 }}>
            {snapOk
              ? `快照連結（${(snapSize / 1024).toFixed(1)} KB，含賽程狀態但不即時）：`
              : `賽程資料太大（${(snapSize / 1024).toFixed(0)} KB），無法用 URL 傳送`
            }
          </span>
          {snapOk && snapUrl && (
            <button className={`share-copy-btn slim ${copied === 'snap' ? 'copied' : ''}`} onClick={() => copy(snapUrl, 'snap')}>
              {copied === 'snap' ? '✓' : '複製快照'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
