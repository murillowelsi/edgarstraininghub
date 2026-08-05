import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { TeamDocument } from "../types/team";
import type { WorkoutAssignmentDocument } from "../types/workoutAssignment";
import { legacyTimestampToDayString } from "../utils/scheduledDay";

const BATCH_LIMIT = 450; // Firestore caps batches at 500 writes

/**
 * One-time backfill: writes the timezone-safe `scheduledDay` string on legacy
 * workout assignments and team assignment entries that only have the
 * `scheduledDate` Timestamp. Legacy Timestamps are interpreted in the coach's
 * timezone (see utils/scheduledDay.ts). Idempotent — documents that already
 * have `scheduledDay` are skipped, so reruns are cheap no-ops.
 */
export const backfillScheduledDays = async (coachId: string): Promise<number> => {
  let patched = 0;

  // Workout assignments (requires admin role per Firestore rules)
  const assignmentsSnap = await getDocs(collection(db, "workoutAssignments"));
  const missing = assignmentsSnap.docs.filter((d) => {
    const data = d.data() as WorkoutAssignmentDocument;
    return !data.scheduledDay && data.scheduledDate;
  });

  for (let i = 0; i < missing.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const d of missing.slice(i, i + BATCH_LIMIT)) {
      const data = d.data() as WorkoutAssignmentDocument;
      batch.update(doc(db, "workoutAssignments", d.id), {
        scheduledDay: legacyTimestampToDayString(data.scheduledDate.toDate()),
      });
    }
    await batch.commit();
    patched += Math.min(BATCH_LIMIT, missing.length - i);
  }

  // Team assignment entries (only teams owned by this coach are updatable)
  const teamsSnap = await getDocs(
    query(collection(db, "teams"), where("coachId", "==", coachId))
  );

  for (const teamDoc of teamsSnap.docs) {
    const data = teamDoc.data() as TeamDocument;
    const entries = data.assignedWorkouts || [];
    if (!entries.some((e) => !e.scheduledDay && e.scheduledDate)) continue;

    const migrated = entries.map((e) =>
      !e.scheduledDay && e.scheduledDate
        ? { ...e, scheduledDay: legacyTimestampToDayString(e.scheduledDate.toDate()) }
        : e
    );

    const batch = writeBatch(db);
    batch.update(doc(db, "teams", teamDoc.id), { assignedWorkouts: migrated });
    await batch.commit();
    patched += 1;
  }

  return patched;
};

let backfillStarted = false;

/** Fire-and-forget wrapper so the backfill runs at most once per session. */
export const runScheduledDayBackfillOnce = (coachId: string): void => {
  if (backfillStarted) return;
  backfillStarted = true;
  backfillScheduledDays(coachId)
    .then((n) => {
      if (n > 0) console.info(`[scheduledDay] backfilled ${n} document(s)`);
    })
    .catch((err) => {
      backfillStarted = false; // allow a retry on the next admin visit
      console.error("[scheduledDay] backfill failed", err);
    });
};
