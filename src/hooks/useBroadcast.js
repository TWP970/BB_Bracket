// hooks/useBroadcast.js
// Multi-layer real-time sync:
//   Layer 1: BroadcastChannel  — same browser, <10ms
//   Layer 2: localStorage poll — same device, ~2s
//   Layer 3: Firebase RTDB     — cross-device, ~200ms (when configured)

import { useEffect, useState, useRef } from 'react';
import { ref, set, onValue, serverTimestamp } from 'firebase/database';
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

    // Layer 1: BroadcastChannel
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'STATE', payload });
      ch.close();
    } catch (_) {}

    // Layer 2: localStorage
    try { localStorage.setItem(LS_KEY, payload); } catch (_) {}

    // Layer 3: Firebase (cross-device)
    if (firebaseReady && roomCode) {
      const roomRef = ref(db, `${FB_ROOT}/${roomCode}`);
      set(roomRef, { payload, ts: Date.now() }).catch(() => {});
    }
  };
  return send;
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
    // Layer 1: BroadcastChannel (same browser)
    let ch;
    try {
      ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (e) => {
        if (e.data?.type === 'STATE') handle(e.data.payload);
      };
    } catch (_) {}

    // Layer 2: localStorage poll (same device, different browsers)
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) handle(raw);
      } catch (_) {}
    }, 2000);

    // Layer 3: Firebase (cross-device)
    let unsubscribeFirebase = null;
    if (firebaseReady && roomCode) {
      const roomRef = ref(db, `${FB_ROOT}/${roomCode}`);
      unsubscribeFirebase = onValue(roomRef, (snapshot) => {
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
