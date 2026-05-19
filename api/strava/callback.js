const { FieldValue } = require('firebase-admin/firestore');
const { db, adminAuth } = require('../_lib/firebase-admin');
const { exchangeCodeForToken } = require('../_lib/strava');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, idToken } = req.body || {};
  if (!code || !idToken) {
    return res.status(400).json({ error: 'Missing code or idToken' });
  }

  let uid;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  try {
    const tokenResp = await exchangeCodeForToken(code);
    await db.doc(`users/${uid}/integrations/strava`).set(
      {
        athleteId: tokenResp.athlete?.id ?? null,
        athleteUsername: tokenResp.athlete?.username ?? null,
        accessToken: tokenResp.access_token,
        refreshToken: tokenResp.refresh_token,
        expiresAt: tokenResp.expires_at,
        scope: tokenResp.scope ?? null,
        connectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastSyncAt: null,
      },
      { merge: true }
    );
    return res.status(200).json({
      ok: true,
      athleteId: tokenResp.athlete?.id ?? null,
    });
  } catch (err) {
    console.error('strava/callback error:', err);
    return res.status(500).json({ error: err.message });
  }
};
