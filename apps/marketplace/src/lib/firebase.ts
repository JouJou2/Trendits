import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import firebaseConfig from './firebase-config.json';

/**
 * The same Firebase project, database and accounts as the website — a shopper
 * signs in with the same email and sees the same products, cart rules and
 * orders. These are the public client settings the website also ships to
 * every browser; access is enforced by Firestore rules, not by hiding them.
 */

// Fast Refresh re-runs this module; reuse the app instead of creating a second.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Keeps shoppers signed in between app launches. On the web preview the
 * browser's own storage is used. getReactNativePersistence ships only in the
 * React Native build of firebase/auth, which TypeScript does not see, hence
 * the lookup through the namespace.
 */
const createAuth = (): Auth => {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    const getReactNativePersistence = (firebaseAuth as unknown as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
    }).getReactNativePersistence;
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Already initialised (Fast Refresh) — hand back the existing instance.
    return getAuth(app);
  }
};

export const auth = createAuth();

/** The website's named Firestore database, not the project default. */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/** Where the website's backend answers — orders, chat and so on go here. */
export const API_BASE = `https://${firebaseConfig.projectId}.web.app`;
