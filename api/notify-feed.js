/**
 * Vercel Serverless Function: POST /api/notify-feed
 *
 * Push for feed activity, called by the client right after the write it already does:
 *   { idToken, postId, kind: "like" }                          → post author
 *   { idToken, postId, kind: "comment", commentId }            → post author
 *   { idToken, postId, kind: "mention", mentionedUid }         → mentioned user (post caption)
 *   { idToken, postId, kind: "mention", mentionedUid, commentId } → mentioned user (comment)
 *
 * The server checks that the action exists and belongs to the caller (the like is
 * in likedBy, the comment exists and is theirs, the mention is in their post or
 * comment), builds the text itself (no client text), never pushes to the caller,
 * and rate-limits per post/actor/recipient (pushThrottle/{key}, server-only).
 *
 * Same env vars as /api/notify (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const messaging = getMessaging();
const adminAuth = getAuth();

const KINDS = new Set(['like', 'comment', 'mention']);
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// Minimum time between two pushes for the same throttle key
export const THROTTLE_MS = {
  like: 30 * 60 * 1000, // per post + liker: unlike/like again does not spam
  comment: 2 * 60 * 1000, // per post + commenter: a burst of comments sends one push
  mention: 10 * 60 * 1000, // per post (or comment) + mentioned user
};

// Recipients' language is not stored yet; the app's main language is Portuguese.
const TEXT = {
  like: (name) => ({ title: 'Nova curtida', body: `${name} curtiu seu post` }),
  comment: (name) => ({ title: 'Novo comentário', body: `${name} comentou no seu post` }),
  mention: (name) => ({ title: 'Você foi mencionado', body: `${name} mencionou você` }),
};

class Forbidden extends Error {}

const publicName = async (uid) => {
  const profile = await db.collection('publicProfiles').doc(uid).get();
  const name = profile.exists ? profile.data().displayName : undefined;
  if (name) return name;
  const user = await db.collection('users').doc(uid).get();
  return (user.exists && user.data().displayName) || 'Alguém';
};

/** Check the action belongs to the caller; return { recipientId, throttleKey, ref } */
async function resolveAction({ uid, postId, kind, commentId, mentionedUid }) {
  const postSnap = await db.collection('timeline_posts').doc(postId).get();
  if (!postSnap.exists) throw new Forbidden();
  const post = postSnap.data();

  const commentOf = async () => {
    const c = await db.collection('timeline_posts').doc(postId).collection('comments').doc(commentId).get();
    if (!c.exists || c.data().authorId !== uid) throw new Forbidden();
    return c.data();
  };

  if (kind === 'like') {
    if (!(post.likedBy || []).includes(uid)) throw new Forbidden();
    return { recipientId: post.authorId, throttleKey: `like_${postId}_${uid}`, ref: 'like' };
  }

  if (kind === 'comment') {
    if (!commentId) throw new Forbidden();
    await commentOf();
    return { recipientId: post.authorId, throttleKey: `comment_${postId}_${uid}`, ref: commentId };
  }

  // mention
  if (!mentionedUid) throw new Forbidden();
  if (commentId) {
    const comment = await commentOf();
    const name = await publicName(mentionedUid);
    if (!String(comment.text || '').toLowerCase().includes(`@${name}`.toLowerCase())) throw new Forbidden();
  } else {
    const mentioned = (post.mentions || []).some((m) => m && m.id === mentionedUid);
    if (post.authorId !== uid || !mentioned) throw new Forbidden();
  }
  return {
    recipientId: mentionedUid,
    throttleKey: `mention_${postId}_${commentId || 'post'}_${mentionedUid}`,
    ref: commentId || 'post',
  };
}

/**
 * Reserve the throttle slot atomically. Returns false when a push for this key
 * was sent within the window, or when this exact action (ref) was already pushed.
 */
async function reserveSlot(throttleKey, kind, ref) {
  const docRef = db.collection('pushThrottle').doc(throttleKey);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const now = Date.now();
    if (snap.exists) {
      const last = snap.data();
      if (now - (last.sentAt || 0) < THROTTLE_MS[kind] || (kind !== 'like' && last.ref === ref)) return false;
    }
    tx.set(docRef, { sentAt: now, ref, kind });
    return true;
  });
}

async function sendToUser(recipientId, { title, body }) {
  const tokensRef = db.collection('users').doc(recipientId).collection('fcmTokens');
  const tokensSnap = await tokensRef.get();
  const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
  if (!tokens.length) return 0;

  const recipient = await db.collection('users').doc(recipientId).get();
  const url = recipient.exists && recipient.data().role === 'admin' ? '/admin/timeline' : '/athlete/timeline';

  const stale = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      try {
        await messaging.send({
          token,
          notification: { title, body },
          data: { url, title, body },
          webpush: {
            notification: { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', tag: url, renotify: 'true' },
            fcmOptions: { link: url },
          },
          apns: { payload: { aps: { sound: 'default' } } },
        });
        sent++;
      } catch (err) {
        if (
          err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered'
        ) {
          stale.push(token);
        }
      }
    })
  );

  if (stale.length) {
    const batch = db.batch();
    stale.forEach((token) => batch.delete(tokensRef.doc(token)));
    await batch.commit();
  }
  return sent;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken, postId, kind, commentId, mentionedUid } = req.body || {};
  if (
    typeof idToken !== 'string' || !idToken ||
    typeof postId !== 'string' || !ID_RE.test(postId) ||
    !KINDS.has(kind) ||
    (commentId !== undefined && (typeof commentId !== 'string' || !ID_RE.test(commentId))) ||
    (mentionedUid !== undefined && (typeof mentionedUid !== 'string' || !ID_RE.test(mentionedUid)))
  ) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  let uid;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  try {
    const { recipientId, throttleKey, ref } = await resolveAction({ uid, postId, kind, commentId, mentionedUid });

    // Never notify yourself (liking or commenting on your own post, self-mention)
    if (!recipientId || recipientId === uid) return res.status(200).json({ sent: 0 });

    if (!(await reserveSlot(throttleKey, kind, ref))) {
      return res.status(200).json({ sent: 0, throttled: true });
    }

    const sent = await sendToUser(recipientId, TEXT[kind](await publicName(uid)));
    return res.status(200).json({ sent });
  } catch (err) {
    if (err instanceof Forbidden) return res.status(403).json({ error: 'Forbidden' });
    console.error('notify-feed error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
