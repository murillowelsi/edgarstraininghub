import { auth } from "../lib/firebase";

const MAX_IDS_PER_CALL = 50; // same limit as api/notify-assign.js

/**
 * Ask /api/notify-assign to push "new workout(s)" to each athlete, one call per
 * athlete (chunks of 50 ids). Call it after the new assignments were written.
 * Fire-and-forget: the server checks the caller is admin and the assignments are
 * new, and rate-limits per athlete. Never for the caller's own account.
 */
export const sendAssignPush = (newIdsByAthlete: Map<string, string[]>): void => {
  const user = auth.currentUser;
  if (!user) return;
  user
    .getIdToken()
    .then((idToken) => {
      for (const [athleteId, ids] of newIdsByAthlete) {
        if (athleteId === user.uid || ids.length === 0) continue;
        for (let i = 0; i < ids.length; i += MAX_IDS_PER_CALL) {
          fetch("/api/notify-assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken, athleteId, assignmentIds: ids.slice(i, i + MAX_IDS_PER_CALL) }),
          }).catch(() => {});
        }
      }
    })
    .catch(() => {
      // Push is best effort; the assignments are saved
    });
};
