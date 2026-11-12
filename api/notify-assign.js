/**
 * Vercel Serverless Function: POST /api/notify-assign
 *
 * One push to an athlete when the coach assigns new workouts:
 *   { idToken, athleteId, assignmentIds: string[] }   (up to 50 per call)
 *
 * - Only admins may call it.
 * - Every assignment must exist, belong to athleteId and have been created or
 *   changed in the last 10 minutes, so old assignments cannot be re-announced.
 * - One push per call. Title: the coach's public name ("Coach" if it is missing or
 *   an e-mail). Body: what happened, e.g. "atribuiu Rodagem Z2 para sex, 14/11"
 *   (links to the workout) or "atribuiu 5 treinos para esta semana" (links to the calendar).
 * - At most one push per athlete every 2 minutes; assignments that arrive inside
 *   the window are kept and counted in the next push.
 * - Text in Portuguese (the recipient's language is not stored yet).
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

export const MAX_IDS = 50;
export const RECENT_MS = 10 * 60 * 1000;
export const THROTTLE_MS = 2 * 60 * 1000;
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

class Forbidden extends Error {}

const looksLikeEmail = (name) => typeof name === 'string' && name.includes('@');

// Same lookup as /api/notify-feed; never put an e-mail address in a push
const coachName = async (uid) => {
  const profile = await db.collection('publicProfiles').doc(uid).get();
  let name = profile.exists ? profile.data().displayName : undefined;
  if (!name) {
    const user = await db.collection('users').doc(uid).get();
    name = user.exists ? user.data().displayName : undefined;
  }
  return name && !looksLikeEmail(name) ? name : 'Coach';
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = (day) => Date.parse(`${day}T00:00:00Z`);
// Monday of the week of a "YYYY-MM-DD" day (or of today), in ms
const weekStart = (ms) => {
  const d = new Date(ms);
  const offset = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offset);
};

/** "para esta semana", "para a próxima semana", "para sex, 14/11" or "de seg, 16/11 a dom, 13/12" */
const periodOf = (days) => {
  const valid = days.filter((d) => typeof d === 'string' && DAY_RE.test(d)).sort();
  if (!valid.length) return '';
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (first === last) return `para ${formatDay(first)}`;
  const thisWeek = weekStart(Date.now());
  const weeks = new Set(valid.map((d) => weekStart(dayMs(d))));
  if (weeks.size === 1 && weeks.has(thisWeek)) return 'para esta semana';
  if (weeks.size === 1 && weeks.has(thisWeek + 7 * 86400000)) return 'para a próxima semana';
  return `de ${formatDay(first)} a ${formatDay(last)}`;
};

const millis = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : 0);

// "2026-11-12" → "qui, 12/11" (the day string is a calendar day, so format it in UTC)
const formatDay = (day) => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(date)
    .replace('.', '');
  return `${weekday}, ${day.slice(8, 10)}/${day.slice(5, 7)}`;
};

/** Check every id: exists, belongs to the athlete, created or updated recently. */
async function loadAssignments(athleteId, ids) {
  const now = Date.now();
  const snaps = await Promise.all(ids.map((id) => db.collection('workoutAssignments').doc(id).get()));
  return snaps.map((snap) => {
    if (!snap.exists) throw new Forbidden();
    const a = snap.data();
    const touched = Math.max(millis(a.createdAt), millis(a.updatedAt));
    if (a.athleteId !== athleteId || now - touched > RECENT_MS) throw new Forbidden();
    return { id: snap.id, ...a };
  });
}

/**
 * Atomically decide whether to push now. Inside the window, the ids are queued
 * and the call returns null; otherwise returns all ids to announce (queued + new).
 */
async function reserve(athleteId, ids) {
  const ref = db.collection('pushThrottle').doc(`assign_${athleteId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const last = snap.exists ? snap.data() : {};
    const queued = Array.isArray(last.pending) ? last.pending : [];
    const all = [...new Set([...queued, ...ids])].slice(-200);
    if (now - (last.sentAt || 0) < THROTTLE_MS) {
      tx.set(ref, { ...last, pending: all, kind: 'assign' });
      return null;
    }
    tx.set(ref, { sentAt: now, pending: [], kind: 'assign' });
    return all;
  });
}

async function buildMessage(ids, title) {
  // Queued ids may have been deleted meanwhile; announce only the ones that still exist
  const snaps = await Promise.all(ids.map((id) => db.collection('workoutAssignments').doc(id).get()));
  const live = snaps.filter((s) => s.exists).map((s) => ({ id: s.id, ...s.data() }));
  if (!live.length) return null;
  if (live.length > 1) {
    const period = periodOf(live.map((a) => a.scheduledDay));
    return { title, body: `atribuiu ${live.length} treinos${period ? ` ${period}` : ''}`, url: '/athlete/calendar' };
  }
  const a = live[0];
  const workout = await db.collection('workouts').doc(a.workoutId).get();
  const name = (workout.exists && workout.data().name) || 'um treino';
  const day = formatDay(a.scheduledDay);
  return { title, body: `atribuiu ${name}${day ? ` para ${day}` : ''}`, url: `/athlete/workout/${a.id}` };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken, athleteId, assignmentIds } = req.body || {};
  if (
    typeof idToken !== 'string' || !idToken ||
    typeof athleteId !== 'string' || !ID_RE.test(athleteId) ||
    !Array.isArray(assignmentIds) || assignmentIds.length === 0 || assignmentIds.length > MAX_IDS ||
    !assignmentIds.every((id) => typeof id === 'string' && ID_RE.test(id))
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
    const caller = await db.collection('users').doc(uid).get();
    if (!caller.exists || caller.data().role !== 'admin') throw new Forbidden();

    const ids = [...new Set(assignmentIds)];
    await loadAssignments(athleteId, ids);

    // Never push to yourself (an admin assigning to their own account)
    if (athleteId === uid) return res.status(200).json({ sent: 0 });

    const toAnnounce = await reserve(athleteId, ids);
    if (!toAnnounce) {
      console.log(JSON.stringify({ fn: 'notify-assign', assignments: ids.length, throttled: true }));
      return res.status(200).json({ sent: 0, throttled: true });
    }

    const message = await buildMessage(toAnnounce, await coachName(uid));
    if (!message) return res.status(200).json({ sent: 0 });

    const tokensRef = db.collection('users').doc(athleteId).collection('fcmTokens');
    const tokensSnap = await tokensRef.get();
    const tokens = [...new Set(tokensSnap.docs.map((d) => d.data().token).filter(Boolean))];
    const stale = [];
    let sent = 0;

    await Promise.all(
      tokens.map(async (token) => {
        try {
          await messaging.send({
            token,
            notification: { title: message.title, body: message.body },
            data: { url: message.url, title: message.title, body: message.body },
            webpush: {
              notification: { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', tag: 'assign', renotify: 'true' },
              fcmOptions: { link: message.url },
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

    // Counts only, like /api/notify
    console.log(JSON.stringify({
      fn: 'notify-assign', assignments: ids.length, announced: toAnnounce.length,
      tokenDocs: tokensSnap.size, distinctTokens: tokens.length, sent, stale: stale.length,
    }));
    return res.status(200).json({ sent });
  } catch (err) {
    if (err instanceof Forbidden) return res.status(403).json({ error: 'Forbidden' });
    console.error('notify-assign error:', err?.code || 'unknown');
    return res.status(500).json({ error: 'Internal error' });
  }
}
