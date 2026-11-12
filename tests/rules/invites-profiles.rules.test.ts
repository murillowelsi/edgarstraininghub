/**
 * Rules for teamInvites/{token} and publicProfiles/{uid} (data-model change A1/B1),
 * including the full /join flow as the app does it. Fictional data only.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-ez-rules";
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8081").split(":");

const COACH = "coach";
const COACH2 = "coach2";
const ANA = "ana";
const TEAM = "team1";
const TOKEN = "invite-token-1";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", COACH), { displayName: "Coach Demo", email: "coach@ez.test", role: "admin" });
    await setDoc(doc(db, "users", COACH2), { displayName: "Coach Two", email: "coach2@ez.test", role: "admin" });
    await setDoc(doc(db, "users", ANA), { displayName: "Ana Demo", email: "ana@ez.test", role: "athlete" });
    await setDoc(doc(db, "publicProfiles", COACH), { displayName: "Coach Demo", photoURL: null, role: "admin" });
    await setDoc(doc(db, "publicProfiles", ANA), { displayName: "Ana Demo", photoURL: null, role: "athlete" });
    await setDoc(doc(db, "teams", TEAM), {
      name: "Team", coachId: COACH, inviteToken: TOKEN, memberIds: [ANA], assignedWorkouts: [],
    });
    await setDoc(doc(db, "teamInvites", TOKEN), {
      teamId: TEAM, teamName: "Team", teamPhotoURL: null, coachId: COACH,
    });
    await setDoc(doc(db, "chats", `team_${TEAM}`), {
      participantIds: [COACH, ANA], isGroup: true, teamId: TEAM, groupName: "Team", unreadCount: {},
    });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const visitor = () => env.unauthenticatedContext().firestore();

describe("publicProfiles", () => {
  it("a signed-in user reads someone else's public profile", async () => {
    await assertSucceeds(getDoc(doc(as(ANA), "publicProfiles", COACH)));
  });

  it("a visitor cannot read public profiles", async () => {
    await assertFails(getDoc(doc(visitor(), "publicProfiles", ANA)));
  });

  it("a new athlete creates users + publicProfiles in one batch (JoinTeam)", async () => {
    const db = as("newbie");
    const batch = writeBatch(db);
    batch.set(doc(db, "users", "newbie"), {
      displayName: "New Demo", email: "new@ez.test", role: "athlete",
      subscriptionStatus: "inactive", subscriptionPlan: "none",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "publicProfiles", "newbie"), {
      displayName: "New Demo", photoURL: null, role: "athlete", updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it("a user cannot claim another role in their public profile", async () => {
    await assertFails(
      setDoc(doc(as(ANA), "publicProfiles", ANA), { displayName: "Ana Demo", photoURL: null, role: "admin" }),
    );
  });

  it("a user cannot publish a name that differs from their users doc", async () => {
    await assertFails(
      setDoc(doc(as(ANA), "publicProfiles", ANA), { displayName: "Coach Demo", photoURL: null, role: "athlete" }),
    );
  });

  it("a user cannot put private fields in the public profile", async () => {
    await assertFails(
      setDoc(doc(as(ANA), "publicProfiles", ANA), {
        displayName: "Ana Demo", photoURL: null, role: "athlete", email: "ana@ez.test",
      }),
    );
  });

  it("a user changes their photo in users and publicProfiles in one batch", async () => {
    const db = as(ANA);
    const batch = writeBatch(db);
    batch.update(doc(db, "users", ANA), { photoURL: "https://example.test/ana.jpg" });
    batch.set(doc(db, "publicProfiles", ANA), {
      displayName: "Ana Demo", photoURL: "https://example.test/ana.jpg", role: "athlete", updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it("a user cannot write someone else's public profile", async () => {
    await assertFails(
      setDoc(doc(as(ANA), "publicProfiles", COACH), { displayName: "Coach Demo", photoURL: null, role: "admin" }),
    );
  });

  it("the admin writes and deletes any public profile", async () => {
    await assertSucceeds(
      setDoc(doc(as(COACH), "publicProfiles", ANA), { displayName: "Ana Renamed", photoURL: null, role: "athlete" }),
    );
    await assertSucceeds(deleteDoc(doc(as(COACH), "publicProfiles", ANA)));
  });

  it("an athlete cannot delete a public profile", async () => {
    await assertFails(deleteDoc(doc(as(ANA), "publicProfiles", ANA)));
  });
});

describe("teamInvites", () => {
  it("a visitor reads one invite by token", async () => {
    await assertSucceeds(getDoc(doc(visitor(), "teamInvites", TOKEN)));
  });

  it("nobody lists invites", async () => {
    await assertFails(getDocs(collection(visitor(), "teamInvites")));
    await assertFails(getDocs(collection(as(ANA), "teamInvites")));
  });

  it("the coach creates a team and its invite in one batch (createTeam)", async () => {
    const db = as(COACH);
    const teamRef = doc(collection(db, "teams"));
    const batch = writeBatch(db);
    batch.set(teamRef, {
      name: "New team", coachId: COACH, inviteToken: "tok-new", memberIds: [],
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "teamInvites", "tok-new"), {
      teamId: teamRef.id, teamName: "New team", teamPhotoURL: null, coachId: COACH,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it("an invite must use the team's own token", async () => {
    await assertFails(
      setDoc(doc(as(COACH), "teamInvites", "other-token"), {
        teamId: TEAM, teamName: "Team", teamPhotoURL: null, coachId: COACH,
      }),
    );
  });

  it("only the team's coach writes its invite", async () => {
    await assertFails(
      setDoc(doc(as(COACH2), "teamInvites", TOKEN), {
        teamId: TEAM, teamName: "Team", teamPhotoURL: null, coachId: COACH2,
      }),
    );
    await assertFails(
      setDoc(doc(as(ANA), "teamInvites", TOKEN), {
        teamId: TEAM, teamName: "Team", teamPhotoURL: null, coachId: ANA,
      }),
    );
  });

  it("the coach renames the team and the invite together (updateTeamName)", async () => {
    const db = as(COACH);
    const batch = writeBatch(db);
    batch.update(doc(db, "teams", TEAM), { name: "Renamed", updatedAt: serverTimestamp() });
    batch.set(doc(db, "teamInvites", TOKEN), {
      teamId: TEAM, teamName: "Renamed", teamPhotoURL: null, coachId: COACH, updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it("the invite cannot show a name that differs from the team", async () => {
    await assertFails(
      setDoc(doc(as(COACH), "teamInvites", TOKEN), {
        teamId: TEAM, teamName: "Free prizes", teamPhotoURL: null, coachId: COACH,
      }),
    );
  });

  it("the coach deletes the invite; an athlete cannot", async () => {
    await assertFails(deleteDoc(doc(as(ANA), "teamInvites", TOKEN)));
    await assertSucceeds(deleteDoc(doc(as(COACH), "teamInvites", TOKEN)));
  });
});

describe("/join flow with teamInvites (as JoinTeam.tsx does it)", () => {
  it("visitor reads invite, registers, joins the team and the group chat", async () => {
    // 1. Before login: only the invite
    const invite = await assertSucceeds(getDoc(doc(visitor(), "teamInvites", TOKEN)));
    const teamId = invite.data()!.teamId as string;

    // 2. Register: users + publicProfiles in one batch
    const uid = "joiner";
    const db = as(uid);
    const batch = writeBatch(db);
    batch.set(doc(db, "users", uid), {
      displayName: "Joiner Demo", email: "joiner@ez.test", role: "athlete",
      subscriptionStatus: "inactive", subscriptionPlan: "none",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "publicProfiles", uid), {
      displayName: "Joiner Demo", photoURL: null, role: "athlete", updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());

    // 3. Signed in: read the team by id, join in a transaction
    const team = await assertSucceeds(getDoc(doc(db, "teams", teamId)));
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        const ref = doc(db, "teams", teamId);
        await tx.get(ref);
        tx.update(ref, { memberIds: arrayUnion(uid), updatedAt: Timestamp.now() });
      }),
    );

    // 4. Group chat sync
    const memberIds = team.data()!.memberIds as string[];
    await assertSucceeds(
      setDoc(
        doc(db, "chats", `team_${teamId}`),
        { participantIds: arrayUnion(COACH, ...memberIds, uid), groupName: "Team", unreadCount: { [uid]: 0 } },
        { merge: true },
      ),
    );
  });
});
