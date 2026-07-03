// context/AuthContext.jsx
// Firebase Authentication: Google sign-in + email/password accounts.
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { auth, authReady } from '../lib/firebase';

const AuthContext = createContext({ user: null, initializing: false });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(authReady);

  useEffect(() => {
    if (!authReady) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
  }, []);

  const signInGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
  const signInEmail = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
  const registerEmail = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);
  const sendVerifyEmail = () => sendEmailVerification(auth.currentUser);
  const signOutUser = () => signOut(auth);
  // Refresh emailVerified etc. — onAuthStateChanged doesn't refire on reload()
  const reloadUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser, providerData: auth.currentUser.providerData });
  };

  return (
    <AuthContext.Provider value={{
      user, initializing, signInGoogle, signInEmail, registerEmail,
      resetPassword, sendVerifyEmail, reloadUser, signOutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
