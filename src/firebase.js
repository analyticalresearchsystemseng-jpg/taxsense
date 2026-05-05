/**
 * TaxSense Local - No-Op Firebase Stub
 * All data is stored locally in IndexedDB/localStorage
 * This file maintains compatibility but does nothing
 */

// No-op auth
export const auth = {
  currentUser: null,
  onAuthStateChanged: () => () => {},
  signOut: async () => {},
  deleteUser: async () => {}
};

// No-op db
export const db = {};

// Stub functions for imports that might remain
export const initializeApp = () => ({});
export const getFirestore = () => ({});
export const initializeAuth = () => ({});
export const indexedDBLocalPersistence = null;
export const browserLocalPersistence = null;
export const GoogleAuthProvider = class {};
export const onAuthStateChanged = () => () => {};
export const signOut = async () => {};
export const deleteUser = async () => {};
export const doc = () => ({});
export const getDoc = async () => ({ exists: () => false });
export const setDoc = async () => {};
export const deleteDoc = async () => {};

console.log('[TaxSense] Running in local-only mode. No Firebase connection.');
