import {
  arrayRemove,
  arrayUnion,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Team, TeamDocument } from "../types/team";

const TEAMS_COLLECTION = "teams";

const docToTeam = (id: string, data: TeamDocument): Team => ({
  id,
  name: data.name,
  coachId: data.coachId,
  inviteToken: data.inviteToken,
  memberIds: data.memberIds || [],
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

export const createTeam = async (name: string, coachId: string): Promise<Team> => {
  const inviteToken = crypto.randomUUID();
  const ref = await addDoc(collection(db, TEAMS_COLLECTION), {
    name,
    coachId,
    inviteToken,
    memberIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return docToTeam(snap.id, snap.data() as TeamDocument);
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

export const getTeamByInviteToken = async (token: string): Promise<Team | null> => {
  const q = query(
    collection(db, TEAMS_COLLECTION),
    where("inviteToken", "==", token)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToTeam(d.id, d.data() as TeamDocument);
};

export const updateTeamName = async (id: string, name: string): Promise<void> => {
  await updateDoc(doc(db, TEAMS_COLLECTION, id), {
    name,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTeam = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, TEAMS_COLLECTION, id));
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
};
