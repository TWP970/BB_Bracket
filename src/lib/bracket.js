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

  propagateByes(matches, rounds, 'se');

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
      const lbInfo = getLBDropInfo(r, p, size);
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
        m.nextMatchId   = mid('lb', nextR, Math.min(Math.floor(p / 2), nextCount - 1));
        m.nextMatchSlot = (r % 2 === 1) ? 2 : (p % 2) + 1;
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

  propagateByes(matches, wbRounds, 'wb');

  return { type: 'double', matches, wbRounds, lbRounds, size, champion: null };
}

function getLBCount(lbR, wbRounds, size) {
  const group = Math.ceil(lbR / 2);
  return Math.max(1, size / Math.pow(2, group + 1));
}

function getLBDropInfo(wbRound, wbPos, size) {
  if (wbRound === 1) {
    const lbPos = Math.floor(wbPos / 2);
    return { id: mid('lb', 1, lbPos), slot: (wbPos % 2) + 1 };
  }
  const lbRound = (wbRound - 1) * 2;
  return { id: mid('lb', lbRound, wbPos), slot: 2 };
}

function propagateByes(matches, wbRounds, prefix) {
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
          next.isCompleted = true;
        }
      });
  }
}

// ── Result Recording ────────────────────────────────────────

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

  // Advance winner
  if (match.nextMatchId && t.matches[match.nextMatchId]) {
    const next = { ...t.matches[match.nextMatchId] };
    if (match.nextMatchSlot === 1) next.player1 = match.winner;
    else next.player2 = match.winner;
    t.matches[match.nextMatchId] = next;
  }

  // Drop loser to LB
  if (match.loserNextMatchId && t.matches[match.loserNextMatchId]) {
    const lb = { ...t.matches[match.loserNextMatchId] };
    if (match.loserNextMatchSlot === 1) lb.player1 = match.loser;
    else lb.player2 = match.loser;
    t.matches[match.loserNextMatchId] = lb;
  }

  // Grand Final reset
  if (matchId === 'gf_1' && t.type === 'double') {
    const gf2 = { ...t.matches['gf_2'] };
    if (match.winner === match.player2) {
      // LB champion won → reset
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

  return t;
}
