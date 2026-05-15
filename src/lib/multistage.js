// lib/multistage.js
import { distributeToGroups } from './utils';
import { generateRoundRobin, recordRRResult, getSortedStandings } from './roundrobin';
import { generateSwiss, generateNextSwissRound, recordSwissResult, getSortedSwissStandings } from './swiss';
import { generateSingleElimination, generateDoubleElimination, recordResult } from './bracket';

export function generateMultiStage(players, config) {
  const {
    numGroups = 4,
    groupFormat = 'roundrobin',
    knockoutFormat = 'single',
    advancePerGroup = 2,
    swissRounds = null
  } = config;

  const groups = distributeToGroups(players, numGroups);

  const groupTournaments = groups.map(group => {
    let t;
    if (groupFormat === 'swiss') {
      t = generateSwiss(group.players, swissRounds);
      t = generateNextSwissRound(t); // ✅ Bug fix: auto-generate round 1
    } else {
      t = generateRoundRobin(group.players);
    }
    return { groupId: group.id, groupName: group.name, format: groupFormat, tournament: t };
  });

  return {
    type: 'multistage',
    stage: 1,
    players,
    config: { numGroups, groupFormat, knockoutFormat, advancePerGroup, swissRounds },
    groups,
    groupTournaments,
    advancedPlayers: [],
    knockoutTournament: null,
    champion: null
  };
}

export function isGroupStageComplete(tournament) {
  return tournament.groupTournaments.every(gt => {
    if (gt.format === 'roundrobin') {
      return gt.tournament.matches.every(m => m.isCompleted);
    }
    // ✅ Bug fix: Swiss complete = all rounds generated AND all matches done
    const t = gt.tournament;
    if (t.currentRound === 0 || t.rounds.length === 0) return false;
    const allMatchesDone = t.rounds.every(r => r.every(m => m.isCompleted));
    return t.currentRound >= t.totalRounds && allMatchesDone;
  });
}

export function advanceToKnockout(tournament) {
  const { advancePerGroup, knockoutFormat } = tournament.config;
  const advanced = [];

  tournament.groupTournaments.forEach(gt => {
    const sorted = gt.format === 'roundrobin'
      ? getSortedStandings(gt.tournament).map(s => s.player)
      : getSortedSwissStandings(gt.tournament).map(s => s.player);
    // Guard: only take up to available players
    const n = Math.min(advancePerGroup, sorted.length);
    sorted.slice(0, n).forEach(p => advanced.push({ ...p, fromGroup: gt.groupName }));
  });

  if (advanced.length < 2) {
    throw new Error('晉級人數不足（至少需要 2 人），請調整分組或晉級設定。');
  }

  const ko = knockoutFormat === 'double'
    ? generateDoubleElimination(advanced)
    : generateSingleElimination(advanced);

  return { ...tournament, stage: 2, advancedPlayers: advanced, knockoutTournament: ko };
}

export function recordMultiStageGroupResult(tournament, groupIdx, matchId, score1, score2) {
  const gts = [...tournament.groupTournaments];
  const gt = { ...gts[groupIdx] };
  if (gt.format === 'roundrobin') {
    gt.tournament = recordRRResult(gt.tournament, matchId, score1, score2);
  } else {
    gt.tournament = recordSwissResult(gt.tournament, matchId, score1, score2);
  }
  gts[groupIdx] = gt;
  return { ...tournament, groupTournaments: gts };
}

export function recordMultiStageKnockoutResult(tournament, matchId, score1, score2) {
  const ko = recordResult(tournament.knockoutTournament, matchId, score1, score2);
  return { ...tournament, knockoutTournament: ko, champion: ko.champion };
}

export function advanceSwissRoundInGroup(tournament, groupIdx) {
  const gts = [...tournament.groupTournaments];
  const gt = { ...gts[groupIdx] };
  gt.tournament = generateNextSwissRound(gt.tournament);
  gts[groupIdx] = gt;
  return { ...tournament, groupTournaments: gts };
}
