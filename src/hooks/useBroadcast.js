// hooks/useBroadcast.js
// Multi-layer real-time sync:
//   Layer 1: BroadcastChannel  — same browser, <10ms
//   Layer 2: localStorage poll — same device, ~2s
//   Layer 3: Firebase RTDB     — cross-device, ~200ms (when configured)

import { useEffect, useState, useRef } from 'react';
import { ref, set, onValue, push, remove, onChildAdded } from 'firebase/database';
import { db, firebaseReady } from '../lib/firebase';

const CHANNEL_NAME = 'bb-bracket-live';
const LS_KEY       = 'bb-bracket-live-state';
const FB_ROOT      = 'bb-bracket-rooms';

// ── Room code helpers ─────────────────────────────────────────
export function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Persist room code so host keeps the same code on reload
export function getOrCreateRoomCode() {
  let code = sessionStorage.getItem('bb-room-code');
  if (!code) {
    code = generateRoomCode();
    sessionStorage.setItem('bb-room-code', code);
  }
  return code;
}

// ── Encode / Decode state for URL snapshot ────────────────────
export function encodeState(tournament) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(tournament)))); }
  catch { return null; }
}
export function decodeState(encoded) {
  try { return JSON.parse(decodeURIComponent(escape(atob(encoded)))); }
  catch { return null; }
}

// ── HOST: send state to all layers ───────────────────────────
export function useBroadcastSend() {
  const send = (tournament, roomCode) => {
    if (!tournament) return;
    const payload = JSON.stringify(tournament);
    const ts = Date.now();

    // Layer 1: BroadcastChannel — tagged with roomCode so spectators
    // of a different room ignore it
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'STATE', payload, roomCode, ts });
      ch.close();
    } catch (_) {}

    // Layer 2: localStorage — envelope with roomCode + write-time ts,
    // so polling can't keep re-asserting stale local state
    try { localStorage.setItem(LS_KEY, JSON.stringify({ payload, roomCode, ts })); } catch (_) {}

    // Layer 3: Firebase (cross-device) — state lives under /state so it
    // never clobbers the judge command queue under /cmd
    if (firebaseReady && roomCode) {
      const stateRef = ref(db, `${FB_ROOT}/${roomCode}/state`);
      set(stateRef, { payload, ts }).catch(() => {});
    }
  };
  return send;
}

// ── JUDGE: push a score command to the host ───────────────────
export function sendJudgeCommand(roomCode, matchId, s1, s2) {
  if (!firebaseReady || !roomCode) return false;
  const cmdRef = ref(db, `${FB_ROOT}/${roomCode}/cmd`);
  push(cmdRef, { matchId, s1, s2, ts: Date.now() }).catch(() => {});
  return true;
}

// ── HOST: apply judge commands, then remove them ──────────────
export function listenJudgeCommands(roomCode, onCommand) {
  if (!firebaseReady || !roomCode) return () => {};
  const cmdRef = ref(db, `${FB_ROOT}/${roomCode}/cmd`);
  return onChildAdded(cmdRef, (snap) => {
    const cmd = snap.val();
    try {
      if (cmd) onCommand?.(cmd);
    } finally {
      remove(snap.ref).catch(() => {});
    }
  }, () => {});
}

// ── SPECTATOR: receive from all layers ────────────────────────
export function useBroadcastReceive(initialState, roomCode) {
  const [tournament, setTournament] = useState(initialState);
  const [lastUpdate, setLastUpdate] = useState(initialState ? new Date() : null);
  const [connected, setConnected]   = useState(false);
  const lastTsRef = useRef(0);

  const handle = (payload, ts = Date.now()) => {
    if (ts <= lastTsRef.current) return; // ignore stale
    try {
      setTournament(JSON.parse(payload));
      setLastUpdate(new Date());
      lastTsRef.current = ts;
      setConnected(true);
    } catch (_) {}
  };

  useEffect(() => {
    // When spectating a specific room, only accept local-layer data
    // tagged with the same room code — otherwise stale state from a
    // tournament previously hosted on THIS device would override the
    // remote one (correct bracket flashes, then gets replaced).
    const roomMatches = (rc) => !roomCode || rc === roomCode;

    // Layer 1: BroadcastChannel (same browser)
    let ch;
    try {
      ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (e) => {
        if (e.data?.type === 'STATE' && roomMatches(e.data.roomCode)) {
          handle(e.data.payload, e.data.ts ?? Date.now());
        }
      };
    } catch (_) {}

    // Layer 2: localStorage poll (same device, different browsers)
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        let rec = null;
        try { rec = JSON.parse(raw); } catch (_) { return; }
        if (rec && typeof rec === 'object' && typeof rec.payload === 'string') {
          // envelope format: { payload, roomCode, ts }
          if (roomMatches(rec.roomCode)) handle(rec.payload, rec.ts ?? Date.now());
        } else if (!roomCode) {
          // legacy format: raw tournament JSON without envelope
          handle(raw);
        }
      } catch (_) {}
    }, 2000);

    // Layer 3: Firebase (cross-device)
    let unsubscribeFirebase = null;
    if (firebaseReady && roomCode) {
      const stateNodeRef = ref(db, `${FB_ROOT}/${roomCode}/state`);
      unsubscribeFirebase = onValue(stateNodeRef, (snapshot) => {
        const data = snapshot.val();
        if (data?.payload) handle(data.payload, data.ts ?? Date.now());
      }, () => {
        // Firebase error — still works via other layers
      });
    }

    return () => {
      ch?.close();
      clearInterval(poll);
      unsubscribeFirebase?.();
    };
  }, [roomCode]);

  return { tournament, setTournament, lastUpdate, connected };
}
