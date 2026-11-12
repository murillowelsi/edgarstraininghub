import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Team, TeamAssignmentDocument, TeamDocument, TeamInvite } from "../types/team";
import { resolveScheduledDate, toDayString } from "../utils/scheduledDay";
import { createAssignments } from "./workoutAssignmentsService";
import { ChatService } from "./chat";

const TEAMS_COLLECTION = "teams";
// teamInvites/{inviteToken}: public by token (no listing), so /join never reads teams.
const INVITES_COLLECTION = "teamInvites";

/** Invite doc mirroring the team's public bits (firestore.rules checks the mirror). */
const inviteDoc = (teamId: string, team: { name: string; photoURL?: string | null; coachId: string }) => ({
  teamId,
  teamName: team.name,
  teamPhotoURL: team.photoURL ?? null,
  coachId: team.coachId,
  updatedAt: serverTimestamp(),
});

const docToTeam = (id: string, data: TeamDocument): Team => ({
  id,
  name: data.name,
  color: data.color,
  photoURL: data.photoURL,
  coachId: data.coachId,
  inviteToken: data.inviteToken,
  memberIds: data.memberIds || [],
  assignedWorkouts: (data.assignedWorkouts || []).map((a) => ({
    workoutId: a.workoutId,
    scheduledDate: resolveScheduledDate(a.scheduledDay, a.scheduledDate),
  })),
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

export const createTeam = async (name: string, coachId: string, color?: string, photoURL?: string): Promise<Team> => {
  const inviteToken = crypto.randomUUID();
  const ref = doc(collection(db, TEAMS_COLLECTION));
  const batch = writeBatch(db);
  batch.set(ref, {
    name,
    coachId,
    inviteToken,
    memberIds: [],
    ...(color && { color }),
    ...(photoURL && { photoURL }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, INVITES_COLLECTION, inviteToken), {
    ...inviteDoc(ref.id, { name, photoURL: photoURL || null, coachId }),
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Failed to read team after creation");
  return docToTeam(snap.id, snap.data() as TeamDocument);
};

export const getTeamsByMember = async (uid: string): Promise<Team[]> => {
  const q = query(
    collection(db, TEAMS_COLLECTION),
    where("memberIds", "array-contains", uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTeam(d.id, d.data() as TeamDocument));
};

export const getTeamsByCoach = async (coachId: string): Promise<Team[]> => {
  const q = query(
    collection(db, TEAMS_COLLECTION),
    where("coachId", "==", coachId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTeam(d.id, d.data() as TeamDocument));
};

export const getTeamById = async (id: string): Promise<Team | null> => {
  const snap = await getDoc(doc(db, TEAMS_COLLECTION, id));
  if (!snap.exists()) return null;
  return docToTeam(snap.id, snap.data() as TeamDocument);
};

/**
 * What the /join page shows for an invite token (works without login).
 * Reads teamInvites/{token}; until the backfill has created invites for older
 * teams, falls back to the legacy teams query (fails once teams is locked down).
 */
export const getTeamInvite = async (token: string): Promise<TeamInvite | null> => {
  const snap = await getDoc(doc(db, INVITES_COLLECTION, token));
  if (snap.exists()) {
    const d = snap.data();
    return {
      token,
      teamId: d.teamId,
      teamName: d.teamName,
      teamPhotoURL: d.teamPhotoURL || undefined,
      coachId: d.coachId,
    };
  }
  try {
    const legacy = await getDocs(query(collection(db, TEAMS_COLLECTION), where("inviteToken", "==", token)));
    if (legacy.empty) return null;
    const t = legacy.docs[0];
    const d = t.data() as TeamDocument;
    return { token, teamId: t.id, teamName: d.name, teamPhotoURL: d.photoURL || undefined, coachId: d.coachId };
  } catch {
    return null;
  }
};

/** Keep the team's invite in sync after its name or photo changed (same batch). */
const updateTeamAndInvite = async (id: string, patch: { name?: string; photoURL?: string | null }) => {
  const teamRef = doc(db, TEAMS_COLLECTION, id);
  const snap = await getDoc(teamRef);
  if (!snap.exists()) throw new Error("Team not found");
  const current = snap.data() as TeamDocument;
  const batch = writeBatch(db);
  batch.update(teamRef, { ...patch, updatedAt: serverTimestamp() });
  if (current.inviteToken) {
    batch.set(
      doc(db, INVITES_COLLECTION, current.inviteToken),
      inviteDoc(id, { ...current, ...patch }),
      { merge: true }
    );
  }
  await batch.commit();
};

export const updateTeamName = async (id: string, name: string): Promise<void> => {
  await updateTeamAndInvite(id, { name });
};

export const updateTeamColor = async (id: string, color: string): Promise<void> => {
  await updateDoc(doc(db, TEAMS_COLLECTION, id), {
    color,
    updatedAt: serverTimestamp(),
  });
};

export const updateTeamPhoto = async (id: string, photoURL: string | null): Promise<void> => {
  await updateTeamAndInvite(id, { photoURL: photoURL ?? null });
};

export const deleteTeam = async (id: string): Promise<void> => {
  const teamRef = doc(db, TEAMS_COLLECTION, id);
  const snap = await getDoc(teamRef);
  const token = snap.exists() ? (snap.data() as TeamDocument).inviteToken : undefined;
  const batch = writeBatch(db);
  batch.delete(teamRef);
  if (token) batch.delete(doc(db, INVITES_COLLECTION, token));
  await batch.commit();
};

/**
 * Atomically add a member to a team.
 * - Uses runTransaction to prevent race conditions at the 30-member cap.
 * - Idempotent: no-op if uid is already in memberIds.
 * - Throws if team is full (>= 30 members).
 */
export const addMemberToTeam = async (teamId: string, uid: string): Promise<void> => {
  const teamRef = doc(db, TEAMS_COLLECTION, teamId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(teamRef);
    if (!snap.exists()) throw new Error("Team not found");
    const data = snap.data() as TeamDocument;
    if (data.memberIds.includes(uid)) return; // already a member — idempotent
    if (data.memberIds.length >= 30) {
      throw new Error("This team is full (max 30 members)");
    }
    // Note: serverTimestamp() cannot be used inside runTransaction — use Timestamp.now()
    tx.update(teamRef, {
      memberIds: arrayUnion(uid),
      updatedAt: Timestamp.now(),
    });
  });
};

export const removeMemberFromTeam = async (teamId: string, uid: string): Promise<void> => {
  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    memberIds: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  });
  // The team group chat only ever grows its participants, so drop the member there too.
  // Best-effort: the chat may not exist yet.
  await updateDoc(doc(db, "chats", `team_${teamId}`), {
    participantIds: arrayRemove(uid),
  }).catch(() => {});
};

/**
 * Record a workout assignment at the team level so late joiners get auto-assigned.
 * Uses arrayUnion so calling it twice for the same workout+date is idempotent.
 */
export const addTeamWorkoutAssignment = async (
  teamId: string,
  workoutId: string,
  scheduledDate: Date
): Promise<void> => {
  const entry: TeamAssignmentDocument = {
    workoutId,
    scheduledDate: Timestamp.fromDate(scheduledDate),
    scheduledDay: toDayString(scheduledDate),
  };
  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    assignedWorkouts: arrayUnion(entry),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Create individual workout assignments for a newly joined athlete
 * based on all workouts previously assigned to the team.
 * Idempotent — createAssignments skips already-existing assignments.
 */
export const autoAssignTeamWorkoutsToMember = async (
  teamId: string,
  uid: string
): Promise<void> => {
  const team = await getTeamById(teamId);
  if (!team || !team.assignedWorkouts.length) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = team.assignedWorkouts.filter(
    (entry) => entry.scheduledDate >= today
  );

  for (const entry of upcoming) {
    await createAssignments(
      { workoutId: entry.workoutId, athleteIds: [uid], scheduledDate: entry.scheduledDate },
      team.coachId
    );
  }
};

/**
 * Join a team from an invite (signed-in athlete): add the member, auto-assign
 * the team's upcoming workouts and sync the group chat. Reads the team by id,
 * which a signed-in user may do even before joining.
 */
export const joinTeamWithInvite = async (invite: TeamInvite, uid: string): Promise<Team> => {
  const team = await getTeamById(invite.teamId);
  if (!team) throw new Error("Team not found");
  await addMemberToTeam(team.id, uid);
  await autoAssignTeamWorkoutsToMember(team.id, uid);
  ChatService.createOrGetGroupChat(team.id, team.name, team.coachId, [...team.memberIds, uid]).catch(() => {});
  return team;
};
