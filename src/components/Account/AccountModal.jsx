// components/Account/AccountModal.jsx
// Sign in (Google or email/password) and manage cloud-saved tournaments.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { authReady } from '../../lib/firebase';
import { saveTournament, listTournaments, loadTournament, deleteTournament } from '../../lib/cloudSave';

const AUTH_ERRORS = {
  'auth/invalid-email': '電子郵件格式不正確',
  'auth/user-not-found': '帳號不存在，請先註冊',
  'auth/wrong-password': '密碼錯誤',
  'auth/invalid-credential': '帳號或密碼錯誤',
  'auth/email-already-in-use': '此電子郵件已註冊，請直接登入',
  'auth/weak-password': '密碼至少需要 6 個字元',
  'auth/popup-closed-by-user': '登入視窗已關閉',
  'auth/too-many-requests': '嘗試次數過多，請稍後再試',
};
const errMsg = (e) => AUTH_ERRORS[e?.code] ?? '操作失敗，請再試一次';

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AccountModal({ onClose }) {
  const { user, signInGoogle, signInEmail, registerEmail, signOutUser } = useAuth();
  const { state, dispatch } = useTournament();
  const tournament = state.tournament;

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saves, setSaves] = useState(null); // null = loading

  const toast = (msg, kind = 'success') =>
    dispatch({ type: 'SHOW_TOAST', payload: { msg, kind } });

  const refreshList = useCallback(async () => {
    if (!user) return;
    try { setSaves(await listTournaments(user.uid)); }
    catch { setSaves([]); }
  }, [user]);

  useEffect(() => {
    if (user) refreshList();
  }, [user, refreshList]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const handleSave = () => run(async () => {
    const t = await saveTournament(user.uid, tournament);
    if (t !== tournament) dispatch({ type: 'SET_TOURNAMENT', payload: t });
    toast('☁️ 賽程已儲存，之後的變動會自動同步');
    refreshList();
  });

  const handleLoad = (id) => run(async () => {
    const t = await loadTournament(user.uid, id);
    if (!t) { setError('載入失敗'); return; }
    dispatch({ type: 'SET_TOURNAMENT', payload: t });
    toast('✅ 已載入雲端賽程');
    onClose();
  });

  const handleDelete = (id) => run(async () => {
    await deleteTournament(user.uid, id);
    // detach the save id if the deleted entry is the active tournament
    if (tournament?._saveId === id) {
      const rest = { ...tournament };
      delete rest._saveId;
      dispatch({ type: 'SET_TOURNAMENT', payload: rest });
    }
    refreshList();
  });

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>

        <div className="share-header">
          <span className="share-title">☁️ 帳號與雲端賽程</span>
          <button className="share-close" onClick={onClose}>✕</button>
        </div>

        {!authReady && (
          <div className="share-warn">
            雲端功能尚未設定。請複製 <code>.env.example</code> 為 <code>.env.local</code>，
            填入憑證後重啟伺服器。
          </div>
        )}

        {authReady && !user && (
          <>
            <button
              className="btn-primary account-google-btn"
              disabled={busy}
              onClick={() => run(() => signInGoogle())}
            >
              <span className="account-g-badge">G</span> 使用 Google 登入
            </button>

            <div className="account-divider"><span>或使用電子郵件</span></div>

            <input
              className="sidebar-input account-input"
              type="email"
              placeholder="電子郵件"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className="sidebar-input account-input"
              type="password"
              placeholder="密碼（至少 6 個字元）"
              value={pw}
              onChange={e => setPw(e.target.value)}
              autoComplete="current-password"
            />
            <div className="account-btn-row">
              <button
                className="btn-primary"
                disabled={busy || !email || pw.length < 6}
                onClick={() => run(() => signInEmail(email, pw))}
              >
                登入
              </button>
              <button
                className="btn-secondary"
                disabled={busy || !email || pw.length < 6}
                onClick={() => run(async () => {
                  await registerEmail(email, pw);
                  toast('🎉 註冊成功，已自動登入');
                })}
              >
                註冊新帳號
              </button>
            </div>
            {error && <div className="account-error">{error}</div>}
            <div className="share-hint">登入後可將賽程儲存到雲端，下次登入即可載入繼續。</div>
          </>
        )}

        {authReady && user && (
          <>
            <div className="account-user-row">
              {user.photoURL
                ? <img className="account-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                : <span className="account-avatar account-avatar-fallback">👤</span>}
              <div className="account-user-info">
                <div className="account-user-name">{user.displayName || '使用者'}</div>
                <div className="account-user-email">{user.email}</div>
              </div>
              <button className="share-copy-btn" disabled={busy} onClick={() => run(() => signOutUser())}>
                登出
              </button>
            </div>

            <button
              className="btn-primary"
              disabled={busy || !tournament}
              onClick={handleSave}
            >
              {tournament
                ? (tournament._saveId ? '💾 立即儲存目前賽程' : '☁️ 將目前賽程存到雲端')
                : '（尚無進行中的賽程可儲存）'}
            </button>
            {tournament?._saveId && (
              <div className="share-hint" style={{ textAlign: 'center' }}>
                此賽程已連結雲端，每次變動會自動儲存
              </div>
            )}

            <div className="account-list-title">我的雲端賽程</div>
            {saves === null && <div className="share-hint">載入中…</div>}
            {saves?.length === 0 && <div className="share-hint">目前沒有已儲存的賽程</div>}
            {saves?.map(s => (
              <div key={s.id} className={`account-save-row ${tournament?._saveId === s.id ? 'active' : ''}`}>
                <div className="account-save-info">
                  <div className="account-save-name">
                    {s.name}
                    {tournament?._saveId === s.id && <span className="account-current-badge">進行中</span>}
                  </div>
                  <div className="account-save-time">{timeAgo(s.updatedAt)}</div>
                </div>
                <button className="share-copy-btn" disabled={busy} onClick={() => handleLoad(s.id)}>
                  載入
                </button>
                <button className="share-copy-btn account-del-btn" disabled={busy} onClick={() => handleDelete(s.id)}>
                  刪除
                </button>
              </div>
            ))}
            {error && <div className="account-error">{error}</div>}
          </>
        )}

      </div>
    </div>
  );
}
