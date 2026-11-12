import { auth } from "../lib/firebase";

export type FeedPush =
  | { postId: string; kind: "like" }
  | { postId: string; kind: "comment"; commentId: string }
  | { postId: string; kind: "mention"; mentionedUid: string; commentId?: string };

/**
 * Ask /api/notify-feed to push this feed action to the post author (or the
 * mentioned user). Call it after the write succeeded. Fire-and-forget: the
 * server checks the action, never pushes to the caller and rate-limits.
 */
export const sendFeedPush = (push: FeedPush): void => {
  const user = auth.currentUser;
  if (!user) return;
  user
    .getIdToken()
    .then((idToken) =>
      fetch("/api/notify-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...push, idToken }),
      })
    )
    .catch(() => {
      // Push is best effort; the in-app notification was already written
    });
};
