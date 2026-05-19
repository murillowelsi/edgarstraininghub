const { db } = require('../_lib/firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const {
  findUserByStravaAthleteId,
  getValidAccessToken,
  fetchActivityById,
  syncActivitiesForUser,
} = require('../_lib/strava');

// Strava webhook reference:
//   GET  /api/strava/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
//        → must echo {"hub.challenge": "<challenge>"} when verify_token matches.
//   POST /api/strava/webhook
//        Body: { object_type, object_id, aspect_type, owner_id, ... }
//        Must respond 200 within 2 seconds; further work is best-effort.

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expected = process.env.VITE_STRAVA_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && expected && token === expected && challenge) {
      return res.status(200).json({ 'hub.challenge': challenge });
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Acknowledge fast — Strava retries if we don't respond within 2s.
  res.status(200).json({ received: true });

  try {
    await handleEvent(req.body || {});
  } catch (err) {
    console.error('strava/webhook handler error:', err);
  }
};

const handleEvent = async (event) => {
  if (event.object_type !== 'activity') return;
  if (event.aspect_type === 'delete') {
    await clearAssignmentForActivity(event.object_id);
    return;
  }
  if (event.aspect_type !== 'create' && event.aspect_type !== 'update') return;

  const lookup = await findUserByStravaAthleteId(event.owner_id);
  if (!lookup) {
    console.warn('strava/webhook: no connected user for athlete', event.owner_id);
    return;
  }

  const accessToken = await getValidAccessToken(lookup.userId, lookup.integration);
  const activity = await fetchActivityById(accessToken, event.object_id);
  if (!activity) return;

  await syncActivitiesForUser(lookup.userId, [activity]);

  await db.doc(`users/${lookup.userId}/integrations/strava`).set(
    { lastSyncAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
};

const clearAssignmentForActivity = async (activityId) => {
  const snap = await db
    .collection('workoutAssignments')
    .where('stravaActivityId', '==', Number(activityId))
    .limit(5)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.forEach((d) => {
    batch.update(d.ref, {
      completedAt: null,
      activityData: null,
      stravaActivityId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
};
