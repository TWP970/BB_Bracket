// context/TournamentContext.jsx
import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { createPlayer } from '../lib/utils';
import { generateSingleElimination, generateDoubleElimination, recordResult } from '../lib/bracket';
import { generateRoundRobin, recordRRResult } from '../lib/roundrobin';
import { generateSwiss, generateNextSwissRound, recordSwissResult } from '../lib/swiss';
import {
  generateMultiStage, advanceToKnockout, recordMultiStageGroupResult,
  recordMultiStageKnockoutResult, advanceSwissRoundInGroup
} from '../lib/multistage';
import { distributeToGroups } from '../lib/utils';
import { useBroadcastSend, getOrCreateRoomCode } from '../hooks/useBroadcast';

const TournamentContext = createContext(null);

const initialState = {
  tournament: null,
  players: [],
  format: 'single',
  config: {
    numGroups: 4,
    groupFormat: 'roundrobin',
    knockoutFormat: 'single',
    advancePerGroup: 2,
    swissRounds: null,
    rrNumGroups: 1,
  },
  toast: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FORMAT':
      return { ...state, format: action.payload };
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'SET_PLAYERS':
      return { ...state, players: action.payload };
    case 'SET_TOURNAMENT':
      return { ...state, tournament: action.payload };
    case 'SHOW_TOAST':
      return { ...state, toast: action.payload };
    case 'CLEAR_TOAST':
      return { ...state, toast: null };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

const MAX_UNDO = 20;

export function TournamentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const broadcast = useBroadcastSend();
  const roomCode  = getOrCreateRoomCode();
  const undoStack = useRef([]);

  // Broadcast every tournament state change to spectator tabs / devices
  useEffect(() => {
    broadcast(state.tournament, roomCode);
  }, [state.tournament]);

  const generate = useCallback((playersOverride) => {
    const players = playersOverride ?? state.players;
    const { format, config } = state;
    if (players.length < 2) {
      dispatch({ type: 'SHOW_TOAST', payload: { msg: '⚠️ 請至少輸入 2 位選手', kind: 'warning' } });
      return;
    }

    // ── Per-format player count guards ─────────────────────────
    if (format === 'roundrobin') {
      const groupSize = Math.ceil(players.length / Math.max(1, config.rrNumGroups));
      if (groupSize > 64) {
        dispatch({ type: 'SHOW_TOAST', payload: { msg: `⚠️ 循環賽每組最多 64 人。目前每組 ${groupSize} 人，請增加分組數（至少 ${Math.ceil(players.length / 64)} 組）`, kind: 'warning' } });
        return;
      }
    }
    if (format === 'multistage') {
      const groupSize = Math.ceil(players.length / Math.max(1, config.numGroups));
      if (groupSize > 64 && config.groupFormat === 'roundrobin') {
        dispatch({ type: 'SHOW_TOAST', payload: { msg: `⚠️ 分組循環賽每組最多 64 人。目前每組 ${groupSize} 人，請增加分組數（至少 ${Math.ceil(players.length / 64)} 組）`, kind: 'warning' } });
        return;
      }
    }
    // ────────────────────────────────────────────────────────────

    try {
      let t;
      switch (format) {
        case 'single':
          t = generateSingleElimination(players);
          break;
        case 'double':
          t = generateDoubleElimination(players);
          break;
        case 'roundrobin':
          if (config.rrNumGroups > 1) {
            const rrGroups = distributeToGroups(players, config.rrNumGroups);
            t = {
              type: 'grouped_rr',
              groupTournaments: rrGroups.map(g => ({
                groupId: g.id, groupName: g.name,
                ...generateRoundRobin(g.players)
              }))
            };
          } else {
            t = generateRoundRobin(players);
          }
          break;
        case 'swiss': {
          let st = generateSwiss(players, config.swissRounds || null);
          st = generateNextSwissRound(st);
          t = st;
          break;
        }
        case 'multistage':
          t = generateMultiStage(players, config);
          break;
        default:
          return;
      }
      dispatch({ type: 'SET_TOURNAMENT', payload: t });
      dispatch({ type: 'SHOW_TOAST', payload: { msg: '🎉 賽程已生成！', kind: 'success' } });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { msg: `❌ ${e.message}`, kind: 'error' } });
    }
  }, [state.players, state.format, state.config]);


  const submitScore = useCallback((matchId, score1, score2, extra = {}) => {
    const t = state.tournament;
    if (!t) return;

    // Save current state for undo
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), JSON.parse(JSON.stringify(t))];

    let updated;

    switch (t.type) {
      case 'single':
      case 'double':
        if (score1 === score2) {
          dispatch({ type: 'SHOW_TOAST', payload: { msg: '⚠️ 淘汰賽不允許平局', kind: 'warning' } });
          return;
        }
        updated = recordResult(t, matchId, score1, score2);
        break;
      case 'roundrobin':
        updated = recordRRResult(t, matchId, score1, score2);
        break;
      case 'grouped_rr': {
        const groupIdx = extra.groupIdx ?? 0;
        const gts = [...t.groupTournaments];
        const updatedGt = { ...gts[groupIdx] };
        updatedGt.tournament = recordRRResult(gts[groupIdx].tournament ?? gts[groupIdx], matchId, score1, score2);
        // Handle both shapes: {tournament, ...} and flat (from generate)
        if (!gts[groupIdx].tournament) {
          // flat shape: the group IS the tournament
          updated = { ...t, groupTournaments: gts.map((g, i) => i === groupIdx
            ? recordRRResult(g, matchId, score1, score2) : g) };
        } else {
          gts[groupIdx] = updatedGt;
          updated = { ...t, groupTournaments: gts };
        }
        break;
      }
      case 'swiss':
        updated = recordSwissResult(t, matchId, score1, score2);
        break;
      case 'multistage':
        if (t.stage === 1) {
          updated = recordMultiStageGroupResult(t, extra.groupIdx ?? 0, matchId, score1, score2);
        } else {
          if (score1 === score2) {
            dispatch({ type: 'SHOW_TOAST', payload: { msg: '⚠️ 淘汰賽不允許平局', kind: 'warning' } });
            return;
          }
          updated = recordMultiStageKnockoutResult(t, matchId, score1, score2);
        }
        break;
      default:
        return;
    }

    dispatch({ type: 'SET_TOURNAMENT', payload: updated });
    dispatch({ type: 'SHOW_TOAST', payload: { msg: `✅ ${score1} : ${score2}`, kind: 'success' } });
  }, [state.tournament]);

  const nextSwissRound = useCallback((groupIdx = null) => {
    const t = state.tournament;
    if (!t) return;
    let updated;
    if (t.type === 'swiss') {
      updated = generateNextSwissRound(t);
    } else if (t.type === 'multistage' && groupIdx !== null) {
      updated = advanceSwissRoundInGroup(t, groupIdx);
    }
    if (updated) dispatch({ type: 'SET_TOURNAMENT', payload: updated });
  }, [state.tournament]);

  const advanceKnockout = useCallback(() => {
    const t = state.tournament;
    if (!t || t.type !== 'multistage') return;
    try {
      const updated = advanceToKnockout(t);
      dispatch({ type: 'SET_TOURNAMENT', payload: updated });
      dispatch({ type: 'SHOW_TOAST', payload: { msg: '🚀 已晉級至決賽圈！', kind: 'success' } });
    } catch (e) {
      dispatch({ type: 'SHOW_TOAST', payload: { msg: `❌ ${e.message}`, kind: 'error' } });
    }
  }, [state.tournament]);

  const undoScore = useCallback(() => {
    if (undoStack.current.length === 0) {
      dispatch({ type: 'SHOW_TOAST', payload: { msg: '⚠️ 沒有可撤回的操作', kind: 'warning' } });
      return;
    }
    const prev = undoStack.current.pop();
    dispatch({ type: 'SET_TOURNAMENT', payload: prev });
    dispatch({ type: 'SHOW_TOAST', payload: { msg: '↩️ 已撤回上一筆比分', kind: 'success' } });
  }, []);

  const canUndo = undoStack.current.length > 0;

  const reset = useCallback(() => {
    undoStack.current = [];
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <TournamentContext.Provider value={{
      state, dispatch, generate, submitScore, undoScore, canUndo, nextSwissRound, advanceKnockout, reset, roomCode
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  return useContext(TournamentContext);
}
