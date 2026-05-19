const { db, adminAuth } = require('../_lib/firebase-admin');
const { getValidAccessToken, deauthorize } = require('../_lib/strava');

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
    const ref = db.doc(`users/${uid}/integrations/strava`);
    const snap = await ref.get();
    if (snap.exists) {
      try {
        const accessToken = await getValidAccessToken(uid, snap.data());
        await deauthorize(accessToken);
      } catch (err) {
        console.warn('strava/disconnect: deauthorize failed (continuing):', err.message);
      }
      await ref.delete();
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('strava/disconnect error:', err);
    return res.status(500).json({ error: err.message });
  }
};
