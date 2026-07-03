// lib/bracket.js
import { nextPowerOf2, arrangePlayers } from './utils';

function mid(prefix, r, p) {
  return `${prefix}_r${r}_p${p}`;
}

function createMatch(id, round, position, bracket = 'winners') {
  return {
    id, round, position, bracket,
    player1: null, player2: null,
    score1: null, score2: null,
    winner: null, loser: null,
    nextMatchId: null, nextMatchSlot: null,
    loserNextMatchId: null, loserNextMatchSlot: null,
    isBye: false, isCompleted: false, isReset: false, locked: false
  };
}

// ── Single Elimination ──────────────────────────────────────

export function generateSingleElimination(players) {
  const size = nextPowerOf2(players.length);
  const arranged = arrangePlayers(players, size);
  const rounds = Math.log2(size);
  const matches = {};

  for (let r = 1; r <= rounds; r++) {
    const count = size / Math.pow(2, r);
    for (let p = 0; p < count; p++) {
      const id = mid('se', r, p);
      const m = createMatch(id, r, p, 'winners');
      if (r === 1) {
        m.player1 = arranged[p * 2];
        m.player2 = arranged[p * 2 + 1];
        if (m.player1?.isBye || m.player2?.isBye) {
          m.isBye = true;
          m.winner = m.player1?.isBye ? m.player2 : m.player1;
          m.loser  = m.player1?.isBye ? m.player1 : m.player2;
          m.isCompleted = true;
        }
      }
      if (r < rounds) {
        m.nextMatchId   = mid('se', r + 1, Math.floor(p / 2));
        m.nextMatchSlot = (p % 2) + 1;
      }
      matches[id] = m;
    }
  }

  propagateByes(matches, rounds);

  return { type: 'single', matches, rounds, size, champion: null };
}

// ── Double Elimination ──────────────────────────────────────

export function generateDoubleElimination(players) {
  const size = nextPowerOf2(players.length);
  const arranged = arrangePlayers(players, size);
  const wbRounds = Math.log2(size);
  const lbRounds = 2 * (wbRounds - 1);
  const matches = {};

  // Winners Bracket
  for (let r = 1; r <= wbRounds; r++) {
    const count = size / Math.pow(2, r);
    for (let p = 0; p < count; p++) {
      const id = mid('wb', r, p);
      const m = createMatch(id, r, p, 'winners');
      if (r === 1) {
        m.player1 = arranged[p * 2];
        m.player2 = arranged[p * 2 + 1];
        if (m.player1?.isBye || m.player2?.isBye) {
          m.isBye = true;
          m.winner = m.player1?.isBye ? m.player2 : m.player1;
          m.loser  = m.player1?.isBye ? m.player1 : m.player2;
          m.isCompleted = true;
        }
      }
      if (r < wbRounds) {
        m.nextMatchId   = mid('wb', r + 1, Math.floor(p / 2));
        m.nextMatchSlot = (p % 2) + 1;
      } else {
        m.nextMatchId   = 'gf_1';
        m.nextMatchSlot = 1;
      }
      // Drop loser to LB
      const lbInfo = getLBDropInfo(r, p);
      m.loserNextMatchId   = lbInfo.id;
      m.loserNextMatchSlot = lbInfo.slot;
      matches[id] = m;
    }
  }

  // Losers Bracket
  for (let r = 1; r <= lbRounds; r++) {
    const count = getLBCount(r, wbRounds, size);
    for (let p = 0; p < count; p++) {
      const id = mid('lb', r, p);
      const m = createMatch(id, r, p, 'losers');
      if (r < lbRounds) {
        const nextR = r + 1;
        const nextCount = getLBCount(nextR, wbRounds, size);
        // Odd→even rounds keep the same match count (winner meets a WB dropper
        // at slot 2), so position maps 1:1; even→odd rounds halve (winners pair up).
        const nextP = (r % 2 === 1) ? p : Math.floor(p / 2);
        m.nextMatchId   = mid('lb', nextR, Math.min(nextP, nextCount - 1));
        m.nextMatchSlot = (r % 2 === 1) ? 1 : (p % 2) + 1;
      } else {
        m.nextMatchId   = 'gf_1';
        m.nextMatchSlot = 2;
      }
      matches[id] = m;
    }
  }

  // Grand Final
  const gf1 = createMatch('gf_1', wbRounds + lbRounds + 1, 0, 'grand_final');
  const gf2 = createMatch('gf_2', wbRounds + lbRounds + 2, 0, 'grand_final');
  gf1.nextMatchId = 'gf_2'; gf1.nextMatchSlot = 1;
  gf2.isReset = true; gf2.locked = true;
  matches['gf_1'] = gf1;
  matches['gf_2'] = gf2;

  propagateByes(matches, wbRounds);

  // Drop BYE losers from WB bye matches into the losers bracket,
  // then auto-resolve any LB matches that now contain a BYE.
  Object.values(matches)
    .filter(m => m.bracket === 'winners' && m.isBye && m.isCompleted && m.loser)
    .sort((a, b) => a.round - b.round)
    .forEach(m => {
      const lb = matches[m.loserNextMatchId];
      if (!lb) return;
      if (m.loserNextMatchSlot === 1) lb.player1 = m.loser;
      else lb.player2 = m.loser;
    });
  resolveLBByesInPlace(matches);

  return { type: 'double', matches, wbRounds, lbRounds, size, champion: null };
}

// Resolve all LB matches containing a BYE (mutating pass, generation time)
function resolveLBByesInPlace(matches) {
  Object.values(matches)
    .filter(m => m.bracket === 'losers')
    .sort((a, b) => a.round - b.round || a.position - b.position)
    .forEach(m => {
      if (m.isCompleted || !m.player1 || !m.player2) return;
      if (!m.player1.isBye && !m.player2.isBye) return;
      m.isBye = true;
      m.winner = m.player1.isBye ? m.player2 : m.player1;
      m.loser  = m.player1.isBye ? m.player1 : m.player2;
      m.isCompleted = true;
      const next = matches[m.nextMatchId];
      if (next) {
        if (m.nextMatchSlot === 1) next.player1 = m.winner;
        else next.player2 = m.winner;
      }
    });
}

function getLBCount(lbR, wbRounds, size) {
  const group = Math.ceil(lbR / 2);
  return Math.max(1, size / Math.pow(2, group + 1));
}

function getLBDropInfo(wbRound, wbPos) {
  if (wbRound === 1) {
    const lbPos = Math.floor(wbPos / 2);
    return { id: mid('lb', 1, lbPos), slot: (wbPos % 2) + 1 };
  }
  const lbRound = (wbRound - 1) * 2;
  return { id: mid('lb', lbRound, wbPos), slot: 2 };
}

function propagateByes(matches, wbRounds) {
  for (let r = 1; r < wbRounds; r++) {
    Object.values(matches)
      .filter(m => m.round === r && m.bracket === 'winners' && m.isBye && m.winner)
      .forEach(m => {
        const next = matches[m.nextMatchId];
        if (!next) return;
        if (m.nextMatchSlot === 1) next.player1 = m.winner;
        else next.player2 = m.winner;
        if (next.player1?.isBye || next.player2?.isBye) {
          next.isBye = true;
          next.winner = next.player1?.isBye ? next.player2 : next.player1;
          next.loser  = next.player1?.isBye ? next.player1 : next.player2;
          next.isCompleted = true;
        }
      });
  }
}

// ── Result Recording ────────────────────────────────────────

// Auto-complete LB matches containing a BYE, cascading the winner forward.
// (Runtime version of resolveLBByesInPlace, works on the immutable copy in t.)
function autoResolveLB(t, startId) {
  let id = startId;
  while (id) {
    const m = t.matches[id];
    if (!m || m.bracket !== 'losers' || m.isCompleted || !m.player1 || !m.player2) return;
    if (!m.player1.isBye && !m.player2.isBye) return;
    const upd = { ...m };
    upd.isBye = true;
    upd.winner = upd.player1.isBye ? upd.player2 : upd.player1;
    upd.loser  = upd.player1.isBye ? upd.player1 : upd.player2;
    upd.isCompleted = true;
    t.matches[id] = upd;
    if (!upd.nextMatchId || !t.matches[upd.nextMatchId]) return;
    const next = { ...t.matches[upd.nextMatchId] };
    if (upd.nextMatchSlot === 1) next.player1 = upd.winner;
    else next.player2 = upd.winner;
    t.matches[upd.nextMatchId] = next;
    id = upd.nextMatchId;
  }
}

// Shared post-completion propagation: advance winner, drop loser,
// resolve LB byes, grand-final & champion bookkeeping.
function applyCompletion(t, match) {
  const matchId = match.id;

  // Advance winner to next match
  if (match.nextMatchId && t.matches[match.nextMatchId]) {
    const next = { ...t.matches[match.nextMatchId] };
    if (match.nextMatchSlot === 1) next.player1 = match.winner;
    else next.player2 = match.winner;
    t.matches[match.nextMatchId] = next;
    autoResolveLB(t, match.nextMatchId);
  }

  // Drop loser to LB (double elim)
  if (match.loserNextMatchId && t.matches[match.loserNextMatchId]) {
    const lb = { ...t.matches[match.loserNextMatchId] };
    if (match.loserNextMatchSlot === 1) lb.player1 = match.loser;
    else lb.player2 = match.loser;
    t.matches[match.loserNextMatchId] = lb;
    autoResolveLB(t, match.loserNextMatchId);
  }

  // Grand Final reset (double elim)
  if (matchId === 'gf_1' && t.type === 'double') {
    const gf2 = { ...t.matches['gf_2'] };
    if (match.winner === match.player2) {
      // LB champion won → bracket reset
      gf2.locked = false;
      gf2.player1 = match.player1;
      gf2.player2 = match.player2;
    } else {
      gf2.locked = true;
      t.champion = match.winner;
    }
    t.matches['gf_2'] = gf2;
  }
  if (matchId === 'gf_2') t.champion = match.winner;

  // Single elim champion
  if (t.type === 'single') {
    const finals = Object.values(t.matches).filter(m => m.round === t.rounds);
    if (finals.length === 1 && finals[0].isCompleted) t.champion = finals[0].winner;
  }
}

export function recordResult(tournament, matchId, score1, score2) {
  const t = { ...tournament };
  t.matches = { ...t.matches };
  const match = { ...t.matches[matchId] };
  if (!match || match.isBye) return t;

  match.score1 = score1;
  match.score2 = score2;
  if (score1 === score2) { t.matches[matchId] = match; return t; }

  match.winner = score1 > score2 ? match.player1 : match.player2;
  match.loser  = score1 > score2 ? match.player2 : match.player1;
  match.isCompleted = true;
  t.matches[matchId] = match;

  applyCompletion(t, match);
  return t;
}

// ── Click-to-Advance ────────────────────────────────────────
// Advance a specific player in a match (click to win)
export function advancePlayer(tournament, matchId, playerId) {
  const t = { ...tournament };
  t.matches = { ...t.matches };
  const match = { ...t.matches[matchId] };
  if (!match || match.isBye || match.isCompleted || match.locked) return t;

  // Determine which player was clicked
  const isP1 = match.player1?.id === playerId;
  const isP2 = match.player2?.id === playerId;
  if (!isP1 && !isP2) return t;

  // Both players must be present
  if (!match.player1 || !match.player2 || match.player1.isBye || match.player2.isBye) return t;

  match.winner = isP1 ? match.player1 : match.player2;
  match.loser  = isP1 ? match.player2 : match.player1;
  match.score1 = isP1 ? 1 : 0;
  match.score2 = isP1 ? 0 : 1;
  match.isCompleted = true;
  t.matches[matchId] = match;

  applyCompletion(t, match);
  return t;
}

// ── Withdraw ────────────────────────────────────────────────

// Can the player be pulled back out of this slot and everything downstream?
// Auto-resolved BYE matches unwind recursively; manual results block.
function canUnwindFrom(t, id, slot, player) {
  const m = t.matches[id];
  if (!m || !player) return true;
  const key = slot === 1 ? 'player1' : 'player2';
  if (m[key]?.id !== player.id) return true;   // slot holds someone else
  if (!m.isCompleted) return true;
  if (!m.isBye) return false;                  // downstream manual result → block
  return m.nextMatchId ? canUnwindFrom(t, m.nextMatchId, m.nextMatchSlot, m.winner) : true;
}

// Remove a player from a downstream slot, unwinding auto-resolved BYE matches.
function removePlayerDownstream(t, id, slot, player) {
  const m = t.matches[id];
  if (!m || !player) return;
  const key = slot === 1 ? 'player1' : 'player2';
  if (m[key]?.id !== player.id) return;
  const upd = { ...m };
  if (upd.isCompleted && upd.isBye) {
    // auto-resolved: unwind its own advancement first
    if (upd.nextMatchId) removePlayerDownstream(t, upd.nextMatchId, upd.nextMatchSlot, upd.winner);
    upd.isCompleted = false;
    upd.isBye = false;
    upd.winner = null;
    upd.loser = null;
  }
  upd[key] = null;
  t.matches[id] = upd;
}

// Withdraw / undo a completed match result
export function withdrawAdvance(tournament, matchId) {
  const t = { ...tournament };
  t.matches = { ...t.matches };
  const match = { ...t.matches[matchId] };
  if (!match || !match.isCompleted || match.isBye) return t;

  const prevWinner = match.winner;

  // Block if any downstream match was already played manually
  const winnerOk = !match.nextMatchId ||
    canUnwindFrom(t, match.nextMatchId, match.nextMatchSlot, prevWinner);
  const loserOk = !match.loserNextMatchId ||
    canUnwindFrom(t, match.loserNextMatchId, match.loserNextMatchSlot, match.loser);
  if (!winnerOk || !loserOk) return t;

  if (match.nextMatchId) {
    removePlayerDownstream(t, match.nextMatchId, match.nextMatchSlot, prevWinner);
  }
  if (match.loserNextMatchId) {
    removePlayerDownstream(t, match.loserNextMatchId, match.loserNextMatchSlot, match.loser);
  }

  // Reset match
  match.winner = null;
  match.loser = null;
  match.score1 = null;
  match.score2 = null;
  match.isCompleted = false;
  t.matches[matchId] = match;

  // Withdrawing gf_1 resets the bracket-reset match back to locked/empty
  if (matchId === 'gf_1' && t.type === 'double' && t.matches['gf_2']) {
    const gf2 = { ...t.matches['gf_2'] };
    if (!gf2.isCompleted) {
      gf2.locked = true;
      gf2.player1 = null;
      gf2.player2 = null;
      t.matches['gf_2'] = gf2;
    }
  }

  // Clear champion if it was set from this match
  if (t.champion?.id === prevWinner?.id) {
    t.champion = null;
  }

  return t;
}
