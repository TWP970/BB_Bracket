// lib/cloudSave.js
// Save / load tournaments per user under users/{uid}/tournaments/{id}.
import { ref, set, get, remove, push } from 'firebase/database';
import { db } from './firebase';

const basePath = (uid) => `users/${uid}/tournaments`;

const TYPE_NAMES = {
  single: '單淘汰', double: '雙敗淘汰', roundrobin: '循環賽',
  grouped_rr: '分組循環', swiss: '瑞士制', multistage: '多階段',
};

function countPlayers(t) {
  if (Array.isArray(t.players)) return t.players.length;
  if (t.matches && typeof t.matches === 'object') {
    // elimination: count non-bye players in round 1
    return Object.values(t.matches)
      .filter(m => m.round === 1 && m.bracket === 'winners')
      .reduce((n, m) =>
        n + (m.player1 && !m.player1.isBye ? 1 : 0) + (m.player2 && !m.player2.isBye ? 1 : 0), 0);
  }
  if (Array.isArray(t.groupTournaments)) {
    return t.groupTournaments.reduce((n, g) => n + countPlayers(g.tournament ?? g), 0);
  }
  return 0;
}

export function describeTournament(t) {
  const typeName = TYPE_NAMES[t.type] ?? t.type;
  const n = countPlayers(t);
  return n > 0 ? `${typeName} · ${n} 人` : typeName;
}

// Saves (or updates) a tournament; returns the tournament with _saveId set.
export async function saveTournament(uid, tournament) {
  const saveId = tournament._saveId ?? push(ref(db, basePath(uid))).key;
  const t = tournament._saveId ? tournament : { ...tournament, _saveId: saveId };
  await set(ref(db, `${basePath(uid)}/${saveId}`), {
    name: describeTournament(t),
    type: t.type,
    updatedAt: Date.now(),
    payload: JSON.stringify(t),
  });
  return t;
}

export async function listTournaments(uid) {
  const snap = await get(ref(db, basePath(uid)));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, v]) => ({ id, name: v.name, type: v.type, updatedAt: v.updatedAt }))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export async function loadTournament(uid, id) {
  const snap = await get(ref(db, `${basePath(uid)}/${id}`));
  const v = snap.val();
  if (!v?.payload) return null;
  try { return JSON.parse(v.payload); } catch { return null; }
}

export function deleteTournament(uid, id) {
  return remove(ref(db, `${basePath(uid)}/${id}`));
}
