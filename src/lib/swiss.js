// lib/swiss.js
import { defaultSwissRounds } from './utils';

export function generateSwiss(players, totalRounds = null) {
  const rounds = totalRounds ?? defaultSwissRounds(players.length);
  const standings = {};
  players.forEach(p => {
    standings[p.id] = { player: p, points: 0, wins: 0, draws: 0, losses: 0, buchholz: 0, goalsFor: 0, goalsAgainst: 0, opponents: [], hadBye: false };
  });
  return { type: 'swiss', players, standings, totalRounds: rounds, currentRound: 0, rounds: [], matchHistory: [], isComplete: false };
}

export function generateNextSwissRound(tournament) {
  if (tournament.currentRound >= tournament.totalRounds) {
    return { ...tournament, isComplete: true };
  }

  const t = { ...tournament, rounds: [...tournament.rounds], standings: deepCloneStandings(tournament.standings), matchHistory: [...tournament.matchHistory] };
  t.currentRound++;
  const r = t.currentRound;
  const sorted = getSortedSwissStandings(t);
  const unpaired = [...sorted];
  const byes = [];
  const matches = [];

  // Odd player → give bye to lowest without a prior bye
  if (unpaired.length % 2 !== 0) {
    for (let i = unpaired.length - 1; i >= 0; i--) {
      if (!unpaired[i].hadBye) {
        byes.push(unpaired.splice(i, 1)[0]);
        break;
      }
    }
    if (byes.length === 0) byes.push(unpaired.pop());
  }

  const pairs = pairPlayers(unpaired);

  pairs.forEach(([s1, s2], idx) => {
    matches.push({
      id: `sw_r${r}_m${idx}`, round: r, position: idx,
      player1: s1.player, player2: s2.player,
      score1: null, score2: null, isCompleted: false, isBye: false
    });
    t.standings[s1.player.id].opponents.push(s2.player.id);
    t.standings[s2.player.id].opponents.push(s1.player.id);
  });

  byes.forEach((s, idx) => {
    const byeMatch = {
      id: `sw_r${r}_bye${idx}`, round: r, position: pairs.length + idx,
      player1: s.player, player2: { id: 'bye', name: 'BYE', isBye: true },
      score1: 1, score2: 0, isCompleted: true, isBye: true, winner: s.player
    };
    matches.push(byeMatch);
    t.standings[s.player.id].wins++;
    t.standings[s.player.id].points += 3;
    t.standings[s.player.id].hadBye = true;
  });

  t.rounds.push(matches);
  t.matchHistory.push(...matches);
  return t;
}

function pairPlayers(standings) {
  const pool = [...standings];
  const pairs = [];
  while (pool.length >= 2) {
    const p1 = pool.shift();
    let matched = false;
    // Fast opponent lookup instead of scanning matchHistory
    const p1Opponents = new Set(p1.opponents || []);
    
    for (let i = 0; i < pool.length; i++) {
      if (!p1Opponents.has(pool[i].player.id)) {
        pairs.push([p1, pool.splice(i, 1)[0]]);
        matched = true;
        break;
      }
    }
    if (!matched && pool.length > 0) pairs.push([p1, pool.shift()]);
  }
  return pairs;
}

export function recordSwissResult(tournament, matchId, score1, score2) {
  const t = { ...tournament, rounds: tournament.rounds.map(r => [...r]), standings: deepCloneStandings(tournament.standings) };
  let match = null;
  for (let ri = 0; ri < t.rounds.length; ri++) {
    const mi = t.rounds[ri].findIndex(m => m.id === matchId);
    if (mi !== -1) { match = { ...t.rounds[ri][mi] }; t.rounds[ri][mi] = match; break; }
  }
  if (!match || match.isBye) return t;

  if (match.isCompleted) undoSwissStandings(t, match);

  match.score1 = score1; match.score2 = score2; match.isCompleted = true;
  const s1 = t.standings[match.player1.id];
  const s2 = t.standings[match.player2.id];
  s1.goalsFor = (s1.goalsFor || 0) + score1; s1.goalsAgainst = (s1.goalsAgainst || 0) + score2;
  s2.goalsFor = (s2.goalsFor || 0) + score2; s2.goalsAgainst = (s2.goalsAgainst || 0) + score1;

  if (score1 > score2) { match.winner = match.player1; s1.wins++; s1.points += 3; s2.losses++; }
  else if (score2 > score1) { match.winner = match.player2; s2.wins++; s2.points += 3; s1.losses++; }
  else { match.winner = null; s1.draws++; s1.points++; s2.draws++; s2.points++; }

  updateBuchholz(t);
  return t;
}

function undoSwissStandings(t, match) {
  const s1 = t.standings[match.player1.id];
  const s2 = t.standings[match.player2.id];
  const sc1 = match.score1, sc2 = match.score2;
  s1.goalsFor -= sc1; s1.goalsAgainst -= sc2;
  s2.goalsFor -= sc2; s2.goalsAgainst -= sc1;
  if (sc1 > sc2) { s1.wins--; s1.points -= 3; s2.losses--; }
  else if (sc2 > sc1) { s2.wins--; s2.points -= 3; s1.losses--; }
  else { s1.draws--; s1.points--; s2.draws--; s2.points--; }
}

function updateBuchholz(t) {
  Object.values(t.standings).forEach(s => {
    s.buchholz = s.opponents.reduce((sum, oppId) => sum + (t.standings[oppId]?.points ?? 0), 0);
  });
}

export function getSortedSwissStandings(tournament) {
  return Object.values(tournament.standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return b.wins - a.wins;
  });
}

export function isSwissComplete(tournament) {
  return tournament.currentRound >= tournament.totalRounds &&
    tournament.rounds.every(r => r.every(m => m.isCompleted));
}

function deepCloneStandings(s) {
  const out = {};
  for (const k in s) out[k] = { ...s[k], opponents: [...(s[k].opponents || [])] };
  return out;
}
