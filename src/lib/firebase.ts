import type { Analytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { getMessaging, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Local Firebase emulator (npm run dev:emu, see docs/testing/emulator.md).
// Only on when the build sets VITE_USE_EMULATOR=true; otherwise nothing changes.
export const useEmulator = import.meta.env.VITE_USE_EMULATOR === "true";
const emulatorHost = import.meta.env.VITE_EMULATOR_HOST || "127.0.0.1";
// Ports must match "emulators" in firebase.json.
const EMULATOR_PORTS = { auth: 9099, firestore: 8081, storage: 9199 };

// Guard: the emulator must only ever run against a demo project, so a wrong
// .env can never point a local session with fake data at production.
if (useEmulator && !String(firebaseConfig.projectId || "").startsWith("demo-")) {
  throw new Error(
    `VITE_USE_EMULATOR is on but VITE_FIREBASE_PROJECT_ID "${firebaseConfig.projectId}" is not a demo-* project.`
  );
}

const connectAuth = (a: Auth): Auth => {
  if (useEmulator) {
    connectAuthEmulator(a, `http://${emulatorHost}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
  }
  return a;
};

const app = initializeApp(firebaseConfig);
export const auth = connectAuth(getAuth(app));
// Persistent cache: reads work offline (gym basements!) and writes are queued
// in IndexedDB until the connection comes back. Falls back to the default
// in-memory cache where IndexedDB isn't available.
const createDb = (): Firestore => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    console.warn("Firestore persistent cache unavailable:", e);
    return initializeFirestore(app, {});
  }
};
export const db = createDb();
export const storage = getStorage(app);
if (useEmulator) {
  connectFirestoreEmulator(db, emulatorHost, EMULATOR_PORTS.firestore);
  connectStorageEmulator(storage, emulatorHost, EMULATOR_PORTS.storage);
}

// Secondary app instance for creating users without affecting current session
const secondaryApp = initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = connectAuth(getAuth(secondaryApp));

// Google Analytics only starts after the visitor accepts (src/lib/consent.ts,
// ConsentBanner). The SDK is loaded on demand, so nothing is fetched before
// that. It stays null when declined, blocked by an ad blocker, unsupported or
// in the emulator: callers must handle null.
export let analytics: Analytics | null = null;

export const enableAnalytics = async (): Promise<Analytics | null> => {
  if (useEmulator || typeof window === "undefined") return null;
  try {
    const { getAnalytics, isSupported, setAnalyticsCollectionEnabled } = await import("firebase/analytics");
    if (!analytics) {
      if (!(await isSupported())) return null;
      analytics = getAnalytics(app);
    }
    setAnalyticsCollectionEnabled(analytics, true);
  } catch (e) {
    console.warn("Analytics blocked or unavailable", e);
  }
  return analytics;
};

/** Consent withdrawn in this session: stop sending events (no-op if never started). */
export const disableAnalytics = async (): Promise<void> => {
  if (!analytics) return;
  try {
    const { setAnalyticsCollectionEnabled } = await import("firebase/analytics");
    setAnalyticsCollectionEnabled(analytics, false);
  } catch (e) {
    console.warn("Analytics unavailable", e);
  }
};

// Firebase Cloud Messaging — only available in browsers that support service workers.
// Off in the emulator: there is no FCM emulator.
export let messaging: Messaging | null = null;
try {
  if (!useEmulator && typeof window !== "undefined" && "serviceWorker" in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("Firebase Messaging unavailable:", e);
}
