const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { db } = require('./firebase-admin');

const TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token';
const ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';
const DEAUTH_URL = 'https://www.strava.com/oauth/deauthorize';

// Strava sport_type → app WorkoutType.
// Anything not in this map is ignored (e.g. WeightTraining, Hike, Workout, Yoga).
const SPORT_MAP = {
  Run: 'running',
  TrailRun: 'running',
  VirtualRun: 'running',
  Ride: 'cycling',
  VirtualRide: 'cycling',
  MountainBikeRide: 'cycling',
  EBikeRide: 'cycling',
  EMountainBikeRide: 'cycling',
  GravelRide: 'cycling',
  Swim: 'swimming',
};

const mapSportType = (sportType) => SPORT_MAP[sportType] || null;

const exchangeCodeForToken = async (code) => {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
};

const refreshAccessToken = async (refreshToken) => {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed: ${res.status} ${text}`);
  }
  return res.json();
};

// Returns a valid access_token, refreshing it (and persisting) if expired.
const getValidAccessToken = async (userId, integration) => {
  const nowSec = Math.floor(Date.now() / 1000);
  if (integration.expiresAt && integration.expiresAt > nowSec + 60) {
    return integration.accessToken;
  }
  const refreshed = await refreshAccessToken(integration.refreshToken);
  await db.doc(`users/${userId}/integrations/strava`).set(
    {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: refreshed.expires_at,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return refreshed.access_token;
};

const fetchRecentActivities = async (accessToken, afterEpochSec) => {
  const url = new URL(ACTIVITIES_URL);
  url.searchParams.set('per_page', '30');
  if (afterEpochSec) url.searchParams.set('after', String(afterEpochSec));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava activities fetch failed: ${res.status} ${text}`);
  }
  return res.json();
};

const deauthorize = async (accessToken) => {
  // Best-effort; ignore failures.
  try {
    await fetch(DEAUTH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    /* ignore */
  }
};

// Local YYYY-MM-DD from Strava's start_date_local (ISO without tz, expresses athlete local time).
const localDateKey = (startDateLocal) => startDateLocal.slice(0, 10);

// Same key from a JS Date assumed to be in athlete's local tz when stored.
const dateKeyFromDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Convert a Strava activity to the app's ActivityData shape.
const buildActivityData = (activity, workoutType) => {
  const data = {};
  if (typeof activity.elapsed_time === 'number') data.elapsedTime = activity.elapsed_time;
  if (typeof activity.distance === 'number') {
    // Running/cycling stored as km; swimming as m.
    data.distance = workoutType === 'swimming'
      ? Math.round(activity.distance)
      : Number((activity.distance / 1000).toFixed(2));
  }
  if (typeof activity.average_heartrate === 'number') {
    data.avgHeartRate = Math.round(activity.average_heartrate);
  }
  if (typeof activity.average_speed === 'number' && activity.average_speed > 0) {
    if (workoutType === 'running') {
      data.avgPace = Math.round(1000 / activity.average_speed); // sec / km
    } else if (workoutType === 'swimming') {
      data.avgPace = Math.round(100 / activity.average_speed); // sec / 100m
    } else if (workoutType === 'cycling') {
      data.avgSpeed = Number((activity.average_speed * 3.6).toFixed(2)); // km/h
    }
  }
  if (workoutType === 'cycling' && typeof activity.average_watts === 'number') {
    data.avgPower = Math.round(activity.average_watts);
  }
  return data;
};

// For each activity, find an assignment on the same local day whose workout.type matches.
// Returns counts and the per-assignment writes performed.
const syncActivitiesForUser = async (userId, activities) => {
  if (activities.length === 0) return { matched: 0, scanned: 0 };

  // Build set of (dateKey, type) needed for matching.
  const wantedKeys = new Set();
  const activityByKey = new Map();
  for (const act of activities) {
    const type = mapSportType(act.sport_type || act.type);
    if (!type) continue;
    const key = `${localDateKey(act.start_date_local)}::${type}`;
    wantedKeys.add(key);
    // Keep the longest activity per key (heuristic: real session vs. accidental short record).
    const prev = activityByKey.get(key);
    if (!prev || (act.elapsed_time || 0) > (prev.elapsed_time || 0)) {
      activityByKey.set(key, act);
    }
  }
  if (wantedKeys.size === 0) return { matched: 0, scanned: activities.length };

  const assignmentsSnap = await db
    .collection('workoutAssignments')
    .where('athleteId', '==', userId)
    .get();

  if (assignmentsSnap.empty) return { matched: 0, scanned: activities.length };

  // Load needed workouts.
  const workoutIds = new Set();
  assignmentsSnap.forEach((d) => workoutIds.add(d.data().workoutId));
  const workouts = new Map();
  await Promise.all(
    [...workoutIds].map(async (id) => {
      const w = await db.doc(`workouts/${id}`).get();
      if (w.exists) workouts.set(id, w.data());
    })
  );

  // Bucket assignments by (dateKey, type).
  const buckets = new Map();
  assignmentsSnap.forEach((d) => {
    const data = d.data();
    const w = workouts.get(data.workoutId);
    if (!w) return;
    const sched = data.scheduledDate?.toDate?.();
    if (!sched) return;
    const key = `${dateKeyFromDate(sched)}::${w.type}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ id: d.id, data, type: w.type });
  });

  // For each activity, pick the best matching assignment (first uncompleted, else first).
  const batch = db.batch();
  let matched = 0;
  for (const [key, activity] of activityByKey) {
    const candidates = buckets.get(key);
    if (!candidates || candidates.length === 0) continue;
    // Prefer the one already linked to this Strava activity (idempotent), else uncompleted, else any.
    const sameLink = candidates.find((c) => c.data.stravaActivityId === activity.id);
    const target = sameLink
      || candidates.find((c) => !c.data.completedAt)
      || candidates[0];

    const activityData = buildActivityData(activity, target.type);
    batch.update(db.doc(`workoutAssignments/${target.id}`), {
      completedAt: Timestamp.fromDate(new Date(activity.start_date)),
      activityData,
      stravaActivityId: activity.id,
      skipped: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
    matched += 1;
    // Avoid double-assigning the same Strava activity to multiple assignments by removing
    // the selected candidate from the bucket (in case of duplicates).
    buckets.set(
      key,
      candidates.filter((c) => c.id !== target.id)
    );
  }
  if (matched > 0) await batch.commit();
  return { matched, scanned: activities.length };
};

module.exports = {
  exchangeCodeForToken,
  refreshAccessToken,
  getValidAccessToken,
  fetchRecentActivities,
  deauthorize,
  mapSportType,
  syncActivitiesForUser,
};
