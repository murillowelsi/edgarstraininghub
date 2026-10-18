import { auth } from "@/lib/firebase";
import { NotificationService } from "@/services/notifications";

/**
 * Server-sent "rest is over" push for when the session page is in the
 * background (screen locked). Only used if the athlete allowed notifications;
 * failures are silent — the in-app beep/toast still works when they return.
 */
const post = async (payload: Record<string, unknown>, keepalive = false) => {
  const user = auth.currentUser;
  if (!user || !NotificationService.isGranted()) return;
  try {
    const idToken = await user.getIdToken();
    await fetch("/api/rest-timer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, idToken }),
      // Lets the request finish while the page is being hidden
      keepalive,
    });
  } catch {
    // offline / not deployed — ignore
  }
};

export const scheduleRestPush = (delaySec: number, title: string, body: string, url: string) => {
  const timerId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  void post({ action: "start", timerId, delaySec, title, body, url }, true);
};

export const cancelRestPush = () => {
  void post({ action: "cancel" });
};
