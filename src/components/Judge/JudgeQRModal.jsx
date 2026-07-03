// components/Judge/JudgeQRModal.jsx
// Host-side 裁判入口: shows the QR code judges scan to open the
// standalone judge scoring page on their own device.
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTournament } from '../../context/TournamentContext';
import { firebaseReady as fbReady } from '../../lib/firebase';

export default function JudgeQRModal({ onClose }) {
  const { roomCode } = useTournament();
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const base = window.location.origin + window.location.pathname;
  const judgeUrl = `${base}?judge=1&room=${roomCode}`;

  useEffect(() => {
    if (!fbReady) return;
    QRCode.toDataURL(judgeUrl, {
      width: 360,
      margin: 2,
      color: { dark: '#1c2536', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [judgeUrl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(judgeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt('複製以下連結：', judgeUrl);
    }
  };

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>

        <div className="share-header">
          <span className="share-title">🎯 裁判入口</span>
          <button className="share-close" onClick={onClose}>✕</button>
        </div>

        {fbReady ? (
          <>
            {qrDataUrl && (
              <div className="share-qr">
                <img
                  className="share-qr-img judge-qr-img"
                  src={qrDataUrl}
                  alt={`裁判入口 QR Code（房間 ${roomCode}）`}
                />
                <div className="share-hint">📱 裁判掃描 QR Code 進入計分頁面</div>
              </div>
            )}
            <div className="share-url-box">
              <span className="share-url-text">{judgeUrl}</span>
              <button className={`share-copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>
                {copied ? '✓ 已複製' : '複製連結'}
              </button>
            </div>
            <div className="share-hint">
              裁判在自己的裝置上選擇對戰組合並計分，先取得 4 分者獲勝；
              比分會即時回傳並自動晉級，完成後裁判可直接選擇下一場。
            </div>
          </>
        ) : (
          <div className="share-warn">
            雲端同步尚未設定，無法使用裁判入口。請複製 <code>.env.example</code> 為 <code>.env.local</code>，
            填入憑證後重啟伺服器。
          </div>
        )}

      </div>
    </div>
  );
}
