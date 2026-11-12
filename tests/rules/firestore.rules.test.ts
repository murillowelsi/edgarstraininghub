/**
 * Firestore security rules tests, run against the emulator with the rules
 * file in the repo (`npm run test:rules`).
 *
 * Two groups:
 * - "keeps working": flows the app needs today. They pass now and must keep
 *   passing after the rules are hardened.
 * - "security holes": the CORRECT behaviour for the risks in
 *   OpenBot/Shared/ez-project/plan.md, section 2. They FAIL against the
 *   current rules on purpose and turn green when the rules are fixed.
 *
 * All data is fictional.
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
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const PROJECT_ID = "demo-ez-rules";
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8081").split(":");

const COACH = "coach";
const ANA = "ana";
const BRUNO = "bruno";
const OUTSIDER = "outsider"; // logged in, not in the team, no chats
const TEAM = "team1";

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
    const user = (role: string, name: string) => ({
      email: `${name}@ez.test`,
      displayName: name,
      role,
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
    });
    await setDoc(doc(db, "users", COACH), user("admin", "coach"));
    await setDoc(doc(db, "users", ANA), user("athlete", "ana"));
    await setDoc(doc(db, "users", BRUNO), user("athlete", "bruno"));
    await setDoc(doc(db, "users", OUTSIDER), user("athlete", "outsider"));

    await setDoc(doc(db, "teams", TEAM), {
      name: "Team",
      coachId: COACH,
      inviteToken: "secret-invite-token",
      memberIds: [ANA, BRUNO],
    });
    await setDoc(doc(db, "chats", `team_${TEAM}`), {
      participantIds: [COACH, ANA, BRUNO],
      isGroup: true,
      teamId: TEAM,
      groupName: "Team",
    });
    await setDoc(doc(db, "chats", `${ANA}_${COACH}`), {
      participantIds: [COACH, ANA],
      athleteId: ANA,
    });
    await setDoc(doc(db, "chats", `team_${TEAM}`, "messages", "m1"), {
      text: "Bom treino a todos",
      senderId: BRUNO,
      read: false,
    });

    await setDoc(doc(db, "timeline_posts", "p1"), {
      authorId: BRUNO,
      authorName: "bruno",
      authorRole: "athlete",
      caption: "Original caption",
      likedBy: [],
      commentsCount: 1,
    });
    await setDoc(doc(db, "timeline_posts", "p1", "comments", "c1"), {
      authorId: BRUNO,
      authorName: "bruno",
      authorRole: "athlete",
      text: "Original comment",
      likedBy: [],
    });
    await setDoc(doc(db, "users", BRUNO, "timelineNotifications", "n1"), {
      postId: "p1",
      authorName: "coach",
      actorId: COACH,
      type: "like",
      read: false,
    });

    await setDoc(doc(db, "workoutAssignments", "a1"), {
      workoutId: "w1",
      athleteId: ANA,
      assignedBy: COACH,
      completedAt: null,
    });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const visitor = () => env.unauthenticatedContext().firestore();

describe("keeps working (passes today, must stay green)", () => {
  it("a user reads their own users doc", async () => {
    await assertSucceeds(getDoc(doc(as(ANA), "users", ANA)));
  });

  it("the coach (admin) reads an athlete's users doc", async () => {
    await assertSucceeds(getDoc(doc(as(COACH), "users", ANA)));
  });

  it("a new user creates their own users doc as athlete", async () => {
    await assertSucceeds(
      setDoc(doc(as("newbie"), "users", "newbie"), {
        email: "newbie@ez.test",
        displayName: "newbie",
        role: "athlete",
      }),
    );
  });

  it("a logged-in user likes someone else's post (only likedBy changes)", async () => {
    await assertSucceeds(updateDoc(doc(as(ANA), "timeline_posts", "p1"), { likedBy: arrayUnion(ANA) }));
  });

  it("a logged-in user likes someone else's comment (only likedBy changes)", async () => {
    await assertSucceeds(
      updateDoc(doc(as(ANA), "timeline_posts", "p1", "comments", "c1"), { likedBy: arrayUnion(ANA) }),
    );
  });

  it("a participant marks another participant's message as read", async () => {
    await assertSucceeds(updateDoc(doc(as(ANA), "chats", `team_${TEAM}`, "messages", "m1"), { read: true }));
  });

  it("an athlete records completion on their own assignment", async () => {
    await assertSucceeds(
      updateDoc(doc(as(ANA), "workoutAssignments", "a1"), {
        completedAt: serverTimestamp(),
        completionPercentage: 100,
        rpe: 7,
        athleteNotes: "ok",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("a team member reads the team group chat", async () => {
    await assertSucceeds(getDoc(doc(as(ANA), "chats", `team_${TEAM}`)));
  });

  it("another user cannot write my fcmTokens", async () => {
    await assertFails(setDoc(doc(as(BRUNO), "users", ANA, "fcmTokens", "tok"), { token: "tok" }));
  });
});

describe("security holes (FAIL today on purpose; green once firestore.rules is fixed)", () => {
  // Risk 1 — CRITICAL: privilege escalation
  it("[risk 1] a user cannot create their own users doc with role admin", async () => {
    await assertFails(
      setDoc(doc(as("attacker"), "users", "attacker"), {
        email: "attacker@ez.test",
        displayName: "attacker",
        role: "admin",
      }),
    );
  });

  it("[risk 1] a user cannot create their own users doc with role editor", async () => {
    await assertFails(
      setDoc(doc(as("attacker"), "users", "attacker"), {
        email: "attacker@ez.test",
        displayName: "attacker",
        role: "editor",
      }),
    );
  });

  // Risk 2 — HIGH: data leaks
  // PENDING (skip) until the user approves the data-model proposal
  // (OpenBot/Shared/ez-project/notes/backend-data-model-proposal.md):
  // - users: feed/chat/mentions read other users' docs; needs a public profile split (b).
  // - teams: /join looks a team up by inviteToken without auth; needs teamInvites or
  //   /api/join-team (a). The rule change is ready on branch backend/teams-read-lock.
  it.skip("[risk 2] an athlete cannot read another athlete's users doc", async () => {
    await assertFails(getDoc(doc(as(ANA), "users", BRUNO)));
  });

  it.skip("[risk 2] an athlete cannot list all users", async () => {
    await assertFails(getDocs(collection(as(ANA), "users")));
  });

  it.skip("[risk 2] a visitor cannot read a team doc (inviteToken, memberIds)", async () => {
    await assertFails(getDoc(doc(visitor(), "teams", TEAM)));
  });

  it.skip("[risk 2] a visitor cannot list teams", async () => {
    await assertFails(getDocs(collection(visitor(), "teams")));
  });

  it("[risk 2] a non-member cannot add themselves to a team group chat", async () => {
    await assertFails(
      updateDoc(doc(as(OUTSIDER), "chats", `team_${TEAM}`), { participantIds: arrayUnion(OUTSIDER) }),
    );
  });

  // Risk 3 — HIGH: writes without ownership
  it("[risk 3] a user cannot edit the caption of someone else's post", async () => {
    await assertFails(updateDoc(doc(as(ANA), "timeline_posts", "p1"), { caption: "hacked" }));
  });

  it("[risk 3] a user cannot add someone else's uid to likedBy", async () => {
    await assertFails(updateDoc(doc(as(ANA), "timeline_posts", "p1"), { likedBy: arrayUnion(COACH) }));
  });

  it("[risk 3] a user cannot edit the text of someone else's comment", async () => {
    await assertFails(
      updateDoc(doc(as(ANA), "timeline_posts", "p1", "comments", "c1"), { text: "hacked" }),
    );
  });

  it("[risk 3] a user cannot create a notification for another user posing as someone else", async () => {
    await assertFails(
      setDoc(doc(as(ANA), "users", BRUNO, "timelineNotifications", "fake"), {
        postId: "p1",
        authorName: "coach",
        actorId: COACH, // not the caller
        type: "comment",
        read: false,
      }),
    );
  });

  it("[risk 3] a user cannot delete another user's notification", async () => {
    await assertFails(deleteDoc(doc(as(ANA), "users", BRUNO, "timelineNotifications", "n1")));
  });

  it("[risk 3] a chat participant cannot edit another participant's message", async () => {
    await assertFails(
      updateDoc(doc(as(ANA), "chats", `team_${TEAM}`, "messages", "m1"), { text: "hacked" }),
    );
  });

  it("[risk 3] a chat participant cannot delete another participant's message", async () => {
    await assertFails(deleteDoc(doc(as(ANA), "chats", `team_${TEAM}`, "messages", "m1")));
  });

  it("[risk 3] an athlete cannot change athleteId on their own assignment", async () => {
    await assertFails(updateDoc(doc(as(ANA), "workoutAssignments", "a1"), { athleteId: BRUNO }));
  });

  // Risk 6 — push: token registration is denied today
  it("[risk 6] a user can save their own FCM token in users/{uid}/fcmTokens", async () => {
    await assertSucceeds(
      setDoc(doc(as(ANA), "users", ANA, "fcmTokens", "tok-ana"), {
        token: "tok-ana",
        updatedAt: new Date(),
        platform: "test",
      }),
    );
  });
});
