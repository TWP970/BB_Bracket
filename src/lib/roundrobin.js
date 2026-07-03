// lib/roundrobin.js

export function generateRoundRobin(players) {
  const standings = {};
  players.forEach(p => {
    standings[p.id] = { player: p, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
  });

  const list = [...players];
  const hasBye = list.length % 2 !== 0;
  if (hasBye) list.push({ id: 'bye', name: 'BYE', isBye: true });
  const N = list.length;
  const numRounds = N - 1;
  const matchesPerRound = N / 2;
  const fixed = list[0];
  const rotating = list.slice(1);
  const totalMatches = numRounds * matchesPerRound;
  const matches = new Array(totalMatches);
  let matchIdx = 0;

  for (let r = 0; r < numRounds; r++) {
    const roundList = [fixed, ...rotating];
    for (let m = 0; m < matchesPerRound; m++) {
      const p1 = roundList[m];
      const p2 = roundList[N - 1 - m];
      if (!p1.isBye && !p2.isBye) {
        matches[matchIdx++] = {
          id: `rr_r${r + 1}_m${m}`,
          round: r + 1,
          position: m,
          player1: p1,
          player2: p2,
          score1: null, score2: null,
          isCompleted: false
        };
      }
    }
    rotating.unshift(rotating.pop());
  }
  
  // Remove empty slots if there were byes
  matches.length = matchIdx;

  return { type: 'roundrobin', players, matches, standings, totalRounds: numRounds };
}

export function recordRRResult(tournament, matchId, score1, score2) {
  const t = { ...tournament, matches: [...tournament.matches], standings: deepCloneStandings(tournament.standings) };
  const idx = t.matches.findIndex(m => m.id === matchId);
  if (idx === -1) return t;
  const match = { ...t.matches[idx] };

  if (match.isCompleted) undoRRStandings(t, match);

  match.score1 = score1;
  match.score2 = score2;
  match.isCompleted = true;
  t.matches[idx] = match;

  const s1 = t.standings[match.player1.id];
  const s2 = t.standings[match.player2.id];
  s1.goalsFor += score1; s1.goalsAgainst += score2;
  s2.goalsFor += score2; s2.goalsAgainst += score1;

  if (score1 > score2) { s1.wins++; s1.points += 3; s2.losses++; }
  else if (score2 > score1) { s2.wins++; s2.points += 3; s1.losses++; }
  else { s1.draws++; s1.points++; s2.draws++; s2.points++; }

  return t;
}

function undoRRStandings(t, match) {
  const s1 = t.standings[match.player1.id];
  const s2 = t.standings[match.player2.id];
  const sc1 = match.score1, sc2 = match.score2;
  s1.goalsFor -= sc1; s1.goalsAgainst -= sc2;
  s2.goalsFor -= sc2; s2.goalsAgainst -= sc1;
  if (sc1 > sc2) { s1.wins--; s1.points -= 3; s2.losses--; }
  else if (sc2 > sc1) { s2.wins--; s2.points -= 3; s1.losses--; }
  else { s1.draws--; s1.points--; s2.draws--; s2.points--; }
}

export function getSortedStandings(tournament) {
  return Object.values(tournament.standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

function deepCloneStandings(s) {
  const out = {};
  for (const k in s) out[k] = { ...s[k] };
  return out;
}
