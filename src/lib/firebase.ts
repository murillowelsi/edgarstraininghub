import { getAnalytics, type Analytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
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

// Secondary app instance for creating users without affecting current session
const secondaryApp = initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryApp);

// Analytics is optional - may be blocked by ad blockers
export let analytics: Analytics | null = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Analytics blocked or unavailable");
}

// Firebase Cloud Messaging — only available in browsers that support service workers
export let messaging: Messaging | null = null;
try {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("Firebase Messaging unavailable:", e);
}
