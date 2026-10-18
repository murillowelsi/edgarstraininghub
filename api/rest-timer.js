/**
 * Vercel Serverless Function: POST /api/rest-timer
 *
 * Push "rest is over" to the athlete's own devices when the session page is in
 * the background (screen locked), since browsers can't schedule local
 * notifications. The client calls:
 *   { action: "start", idToken, timerId, delaySec, title, body, url }
 *     → answers immediately, then (waitUntil) pushes after delaySec unless cancelled/replaced
 *   { action: "cancel", idToken }
 *     → the athlete came back to the app; drop any pending push
 *
 * Uses the same env vars as /api/notify (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY). Waiting costs almost no CPU on Fluid Compute.
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getAuth } = require('firebase-admin/auth');
const { waitUntil } = require('@vercel/functions');

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

// Stay well under the function duration limit
const MAX_DELAY_SEC = 280;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWhenDue({ uid, timerRef, timerId, delay, title, body, url }) {
  await sleep(delay * 1000);

  // Only the latest, uncancelled timer may notify
  const current = (await timerRef.get()).data();
  if (!current || current.timerId !== timerId) return;

  const tokensSnap = await db.collection('users').doc(uid).collection('fcmTokens').get();
  const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
  const link = typeof url === 'string' && url.startsWith('/') ? url : '/athlete';

  await Promise.all(
    tokens.map((token) =>
      messaging
        .send({
          token,
          notification: { title: title || 'Rest over', body: body || '' },
          data: { url: link, title: title || 'Rest over', body: body || '' },
          webpush: {
            notification: {
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              vibrate: [200, 100, 200],
              tag: 'rest-timer',
              renotify: 'true',
            },
            fcmOptions: { link },
          },
          apns: { payload: { aps: { sound: 'default' } } },
        })
        // Stale tokens are cleaned up by /api/notify
        .catch(() => {})
    )
  );

  await timerRef.set({ timerId: null, updatedAt: Date.now() });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, idToken, timerId, delaySec, title, body, url } = req.body || {};
  if (!idToken || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let uid;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  const timerRef = db.collection('restTimers').doc(uid);

  if (action === 'cancel') {
    await timerRef.set({ timerId: null, updatedAt: Date.now() });
    return res.status(200).json({ cancelled: true });
  }

  if (action !== 'start' || !timerId || typeof delaySec !== 'number') {
    return res.status(400).json({ error: 'Invalid start request' });
  }

  const delay = Math.max(0, Math.min(MAX_DELAY_SEC, Math.round(delaySec)));
  await timerRef.set({ timerId, endsAt: Date.now() + delay * 1000, updatedAt: Date.now() });

  // Answer right away: the phone may drop the connection when the screen
  // locks, and the push must still go out. waitUntil keeps the work alive.
  waitUntil(sendWhenDue({ uid, timerRef, timerId, delay, title, body, url }));
  return res.status(202).json({ scheduled: true });
};
