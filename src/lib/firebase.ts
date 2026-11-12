import { getAnalytics, type Analytics } from "firebase/analytics";
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
// Defaults match firebase.json; override to run a second emulator side by side.
const EMULATOR_PORTS = {
  auth: Number(import.meta.env.VITE_EMULATOR_AUTH_PORT || 9099),
  firestore: Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || 8081),
  storage: Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT || 9199),
};

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

// Analytics is optional - may be blocked by ad blockers. Off in the emulator.
export let analytics: Analytics | null = null;
try {
  if (!useEmulator) analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics blocked or unavailable");
}

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
