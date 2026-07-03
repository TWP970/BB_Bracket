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
  'auth/weak-password': '密碼強度不足（至少 8 碼，含英文字母與數字）',
  'auth/password-does-not-meet-requirements': '密碼強度不足（至少 8 碼，含英文字母與數字）',
  'auth/popup-closed-by-user': '登入視窗已關閉',
  'auth/too-many-requests': '嘗試次數過多，請稍後再試',
};
const errMsg = (e) => AUTH_ERRORS[e?.code] ?? '操作失敗，請再試一次';

// Client-side password policy for new accounts: >=8 chars, letter + number
const isStrongPassword = (pw) => pw.length >= 8 && /[a-z]/i.test(pw) && /\d/.test(pw);

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AccountModal({ onClose }) {
  const {
    user, signInGoogle, signInEmail, registerEmail,
    resetPassword, sendVerifyEmail, reloadUser, signOutUser,
  } = useAuth();
  const { state, dispatch } = useTournament();
  const tournament = state.tournament;

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saves, setSaves] = useState(null); // null = loading

  const isPasswordUser = user?.providerData?.some(p => p.providerId === 'password');

  // Freshen emailVerified when the modal opens (verification happens
  // out-of-band via the email link)
  useEffect(() => {
    if (user && isPasswordUser && !user.emailVerified) reloadUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setInfo('');
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
              placeholder="密碼"
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
                disabled={busy || !email || !isStrongPassword(pw)}
                onClick={() => run(async () => {
                  await registerEmail(email, pw);
                  sendVerifyEmail().catch(() => {});
                  toast('🎉 註冊成功，驗證信已寄出');
                })}
              >
                註冊新帳號
              </button>
            </div>
            <div className="share-hint">註冊密碼需至少 8 碼，並包含英文字母與數字。</div>
            <button
              className="account-link-btn"
              disabled={busy || !email}
              onClick={() => run(async () => {
                await resetPassword(email);
                setInfo('重設密碼信已寄出（若該信箱已註冊），請至信箱點擊連結重設。');
              })}
            >
              忘記密碼？寄送重設信
            </button>
            {error && <div className="account-error">{error}</div>}
            {info && <div className="account-info">{info}</div>}
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

            {isPasswordUser && (
              <div className={`account-verify-row ${user.emailVerified ? 'ok' : ''}`}>
                <span className="account-verify-status">
                  {user.emailVerified ? '✅ 電子郵件已驗證' : '⚠️ 電子郵件尚未驗證'}
                </span>
                {!user.emailVerified && (
                  <>
                    <button
                      className="share-copy-btn"
                      disabled={busy}
                      onClick={() => run(async () => {
                        await sendVerifyEmail();
                        setInfo('驗證信已寄出，請至信箱點擊連結完成驗證。');
                      })}
                    >
                      重寄驗證信
                    </button>
                    <button
                      className="share-copy-btn"
                      disabled={busy}
                      onClick={() => run(() => reloadUser())}
                      title="完成信箱驗證後點此更新狀態"
                    >
                      更新狀態
                    </button>
                  </>
                )}
              </div>
            )}
            {info && <div className="account-info">{info}</div>}

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
