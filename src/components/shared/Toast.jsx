// components/shared/Toast.jsx
import { useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';

export default function Toast() {
  const { state, dispatch } = useTournament();
  const toast = state.toast;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 3000);
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.kind}`}>
      {toast.msg}
    </div>
  );
}
