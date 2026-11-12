/**
 * api/notify-assign.js with an in-memory fake of the Firebase Admin SDK
 * (no credentials, no network). Fictional ids only.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();
const pushes: { token: string; title: string; body: string; url: string }[] = [];
let invalidTokens = new Set<string>();

const ts = (ms: number) => ({ toMillis: () => ms });
const docRef = (path: string) => ({
  path,
  get: async () => ({ exists: store.has(path), id: path.split("/").pop(), data: () => store.get(path) }),
  collection: (name: string) => collectionRef(`${path}/${name}`),
});
const collectionRef = (path: string) => ({
  doc: (id: string) => docRef(`${path}/${id}`),
  get: async () => {
    const docs = [...store.entries()]
      .filter(([k]) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes("/"))
      .map(([, v]) => ({ data: () => v }));
    return { empty: docs.length === 0, size: docs.length, docs };
  },
});
const fakeDb = {
  collection: (name: string) => collectionRef(name),
  runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: (ref: { get: () => Promise<unknown> }) => ref.get(),
      set: (ref: { path: string }, data: Doc) => { store.set(ref.path, data); },
    }),
  batch: () => {
    const dels: string[] = [];
    return { delete: (ref: { path: string }) => dels.push(ref.path), commit: async () => dels.forEach((p) => store.delete(p)) };
  },
};

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}], cert: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => fakeDb }));
vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => ({
    send: async (m: { token: string; notification: { title: string; body: string }; data: { url: string } }) => {
      if (invalidTokens.has(m.token)) throw Object.assign(new Error("gone"), { code: "messaging/registration-token-not-registered" });
      pushes.push({ token: m.token, title: m.notification.title, body: m.notification.body, url: m.data.url });
    },
  }),
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: async (t: string) => {
      if (t === "bad") throw new Error("invalid");
      return { uid: t };
    },
  }),
}));

// @ts-expect-error plain JS module without types
const { default: handler, THROTTLE_MS, RECENT_MS } = await import("../../api/notify-assign.js");

const call = async (body: Record<string, unknown>) => {
  const r = { code: 0, body: null as unknown, status(c: number) { r.code = c; return r; }, json(b: unknown) { r.body = b; return r; } };
  await handler({ method: "POST", body }, r);
  return r;
};

const assignment = (id: string, athleteId: string, ageMs = 1000, day = "2026-11-12") =>
  store.set(`workoutAssignments/${id}`, {
    athleteId, workoutId: "w1", scheduledDay: day, createdAt: ts(Date.now() - ageMs), updatedAt: ts(Date.now() - ageMs),
  });

beforeEach(() => {
  store.clear();
  pushes.length = 0;
  invalidTokens = new Set();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T10:00:00Z"));
  store.set("users/coach", { role: "admin", displayName: "Coach Demo" });
  store.set("publicProfiles/coach", { displayName: "Coach Demo" });
  store.set("users/ana", { role: "athlete" });
  store.set("users/ana/fcmTokens/tok-ana", { token: "tok-ana" });
  store.set("workouts/w1", { name: "Força A" });
  assignment("a1", "ana");
  assignment("a2", "ana", 1000, "2026-11-14");
  assignment("b1", "bruno");
  assignment("old", "ana", RECENT_MS + 60_000);
});

describe("/api/notify-assign", () => {
  it("401 with an invalid token", async () => {
    expect((await call({ idToken: "bad", athleteId: "ana", assignmentIds: ["a1"] })).code).toBe(401);
  });

  it("400 on a malformed request or more than 50 ids", async () => {
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: [] })).code).toBe(400);
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: Array.from({ length: 51 }, (_, i) => `x${i}`) })).code).toBe(400);
  });

  it("403 when the caller is not an admin", async () => {
    expect((await call({ idToken: "ana", athleteId: "ana", assignmentIds: ["a1"] })).code).toBe(403);
    expect(pushes).toHaveLength(0);
  });

  it("403 for another athlete's, an old or a missing assignment", async () => {
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a1", "b1"] })).code).toBe(403);
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["old"] })).code).toBe(403);
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["nope"] })).code).toBe(403);
    expect(pushes).toHaveLength(0);
  });

  it("200 with one push naming the workout and day, linking to it", async () => {
    const r = await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a1"] });
    expect(r.code).toBe(200);
    expect(r.body).toEqual({ sent: 1 });
    expect(pushes).toEqual([{ token: "tok-ana", title: "Coach Demo", body: "atribuiu Força A para qui, 12/11", url: "/athlete/workout/a1" }]);
  });

  it("200 with ONE grouped push for several assignments", async () => {
    await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a1", "a2"] });
    expect(pushes).toHaveLength(1);
    expect(pushes[0]).toMatchObject({ title: "Coach Demo", body: "atribuiu 2 treinos para esta semana", url: "/athlete/calendar" });
  });

  it("names the period: next week, one day, or a range", async () => {
    // Today is Thu 12/11/2026; next week starts Mon 16/11
    assignment("n1", "ana", 1000, "2026-11-16");
    assignment("n2", "ana", 1000, "2026-11-20");
    assignment("s1", "bruno", 1000, "2026-11-18");
    assignment("s2", "bruno", 1000, "2026-11-18");
    assignment("r1", "carla", 1000, "2026-11-16");
    assignment("r2", "carla", 1000, "2026-12-13");
    store.set("users/bruno/fcmTokens/tok-bruno", { token: "tok-bruno" });
    store.set("users/carla/fcmTokens/tok-carla", { token: "tok-carla" });
    await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["n1", "n2"] });
    await call({ idToken: "coach", athleteId: "bruno", assignmentIds: ["s1", "s2"] });
    await call({ idToken: "coach", athleteId: "carla", assignmentIds: ["r1", "r2"] });
    expect(pushes.map((p) => p.body)).toEqual([
      "atribuiu 2 treinos para a próxima semana",
      "atribuiu 2 treinos para qua, 18/11",
      "atribuiu 2 treinos de seg, 16/11 a dom, 13/12",
    ]);
  });

  it("title falls back to Coach when the name is an e-mail", async () => {
    store.set("publicProfiles/coach", { displayName: "coach@ez.test" });
    await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a1"] });
    expect(pushes[0].title).toBe("Coach");
    expect(JSON.stringify(pushes)).not.toContain("@");
  });

  it("rate limit per athlete: a second call inside 2 min is held and counted in the next push", async () => {
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a1"] })).body).toEqual({ sent: 1 });
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a2"] })).body).toEqual({ sent: 0, throttled: true });
    vi.setSystemTime(Date.now() + THROTTLE_MS + 1);
    assignment("a3", "ana");
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a3"] })).body).toEqual({ sent: 1 });
    expect(pushes.map((p) => p.body)).toEqual(["atribuiu Força A para qui, 12/11", "atribuiu 2 treinos para esta semana"]);
  });

  it("no push to the caller's own account; invalid tokens are removed", async () => {
    assignment("c1", "coach");
    expect((await call({ idToken: "coach", athleteId: "coach", assignmentIds: ["c1"] })).body).toEqual({ sent: 0 });
    invalidTokens.add("tok-ana");
    expect((await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a1"] })).body).toEqual({ sent: 0 });
    expect(store.has("users/ana/fcmTokens/tok-ana")).toBe(false);
  });

  it("500 without internal details", async () => {
    const original = fakeDb.collection;
    fakeDb.collection = () => { throw new Error("secret internal detail"); };
    const r = await call({ idToken: "coach", athleteId: "ana", assignmentIds: ["a1"] });
    fakeDb.collection = original;
    expect(r.code).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("secret");
  });
});
