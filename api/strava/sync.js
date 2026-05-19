const { FieldValue } = require('firebase-admin/firestore');
const { db, adminAuth } = require('../_lib/firebase-admin');
const {
  getValidAccessToken,
  fetchRecentActivities,
  syncActivitiesForUser,
} = require('../_lib/strava');

// Lookback window when no prior sync (30 days).
const DEFAULT_LOOKBACK_SEC = 30 * 24 * 60 * 60;
// Buffer subtracted from lastSyncAt to catch late edits in Strava.
const SYNC_OVERLAP_SEC = 6 * 60 * 60;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

  let uid;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  try {
    const integrationRef = db.doc(`users/${uid}/integrations/strava`);
    const integrationSnap = await integrationRef.get();
    if (!integrationSnap.exists) {
      return res.status(400).json({ error: 'Strava not connected' });
    }
    const integration = integrationSnap.data();

    const accessToken = await getValidAccessToken(uid, integration);

    const nowSec = Math.floor(Date.now() / 1000);
    const lastSyncSec = integration.lastSyncAt?.seconds ?? null;
    const afterSec = lastSyncSec
      ? Math.max(0, lastSyncSec - SYNC_OVERLAP_SEC)
      : nowSec - DEFAULT_LOOKBACK_SEC;

    const activities = await fetchRecentActivities(accessToken, afterSec);
    const { matched, scanned } = await syncActivitiesForUser(uid, activities);

    await integrationRef.set(
      { lastSyncAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return res.status(200).json({ matched, scanned });
  } catch (err) {
    console.error('strava/sync error:', err);
    return res.status(500).json({ error: err.message });
  }
};
