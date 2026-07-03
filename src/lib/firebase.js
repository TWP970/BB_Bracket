// src/lib/firebase.js
// Firebase Realtime Database for cross-device live spectating,
// plus Authentication for cloud-saving tournaments.
// Falls back gracefully if VITE_FIREBASE_DATABASE_URL is not set.
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

let db = null;
let auth = null;

try {
  const url = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  if (url) {
    const app = initializeApp({
      apiKey:       import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:   import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL:  url,
      projectId:    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    });
    db = getDatabase(app);
    auth = getAuth(app);
  }
} catch (e) {
  console.warn('[BB Bracket] Firebase not configured — cross-device sync disabled.', e);
}

export { db, auth };
export const firebaseReady = !!db;
export const authReady = !!auth;

// dev-only hook for automated tests
if (import.meta.env.DEV && auth) window.__bbAuth = auth;
