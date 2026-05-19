import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type {
  StravaIntegration,
  StravaIntegrationDocument,
} from "../types/integration";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STATE_STORAGE_KEY = "strava_oauth_state";
const RETURN_TO_STORAGE_KEY = "strava_oauth_return";

const requireIdToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
};

export const buildStravaAuthUrl = (returnTo: string): string => {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  if (!clientId) {
    throw new Error("VITE_STRAVA_CLIENT_ID is not configured");
  }
  const state =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  sessionStorage.setItem(STATE_STORAGE_KEY, state);
  sessionStorage.setItem(RETURN_TO_STORAGE_KEY, returnTo);

  const redirectUri = `${window.location.origin}/strava/callback`;
  const url = new URL(STRAVA_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read,activity:read_all");
  url.searchParams.set("state", state);
  return url.toString();
};

export const consumeStravaState = (returnedState: string | null): {
  ok: boolean;
  returnTo: string;
} => {
  const expected = sessionStorage.getItem(STATE_STORAGE_KEY);
  const returnTo =
    sessionStorage.getItem(RETURN_TO_STORAGE_KEY) || "/athlete/profile";
  sessionStorage.removeItem(STATE_STORAGE_KEY);
  sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  return { ok: Boolean(expected) && expected === returnedState, returnTo };
};

export const completeStravaAuth = async (code: string): Promise<void> => {
  const idToken = await requireIdToken();
  const res = await fetch("/api/strava/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Strava connect failed");
  }
};

export const syncStrava = async (): Promise<{ matched: number; scanned: number }> => {
  const idToken = await requireIdToken();
  const res = await fetch("/api/strava/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Strava sync failed");
  }
  return res.json();
};

export const disconnectStrava = async (): Promise<void> => {
  const idToken = await requireIdToken();
  const res = await fetch("/api/strava/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Strava disconnect failed");
  }
};

export const subscribeToStravaIntegration = (
  userId: string,
  callback: (integration: StravaIntegration | null) => void
): (() => void) => {
  const ref = doc(db, "users", userId, "integrations", "strava");
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as StravaIntegrationDocument;
    callback({
      athleteId: data.athleteId,
      athleteUsername: data.athleteUsername,
      scope: data.scope,
      connectedAt: data.connectedAt?.toDate() ?? null,
      lastSyncAt: data.lastSyncAt?.toDate() ?? null,
    });
  });
};
