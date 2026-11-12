/**
 * api/notify-feed.js with an in-memory fake of the Firebase Admin SDK
 * (no credentials, no network). Fictional ids only.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── In-memory Firestore (only what the handler uses) ─────────────────────────
type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();
const sent: string[] = [];
const messages: { notification?: { title?: string; body?: string } }[] = [];
let invalidTokens = new Set<string>();

const docRef = (path: string) => ({
  path,
  get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
  collection: (name: string) => collectionRef(`${path}/${name}`),
});
const collectionRef = (path: string) => ({
  doc: (id: string) => docRef(`${path}/${id}`),
  get: async () => {
    const docs = [...store.entries()]
      .filter(([k]) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes("/"))
      .map(([, v]) => ({ data: () => v }));
    return { empty: docs.length === 0, docs };
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
    send: async (m: { token: string; notification?: { title?: string; body?: string } }) => {
      if (invalidTokens.has(m.token)) throw Object.assign(new Error("gone"), { code: "messaging/registration-token-not-registered" });
      sent.push(m.token);
      messages.push(m);
    },
  }),
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: async (t: string) => {
      if (t === "bad") throw new Error("invalid");
      return { uid: t }; // the test token is the uid
    },
  }),
}));

// @ts-expect-error plain JS module without types
const { default: handler, THROTTLE_MS } = await import("../../api/notify-feed.js");

const call = async (body: Record<string, unknown>) => {
  const r = { code: 0, body: null as unknown, status(c: number) { r.code = c; return r; }, json(b: unknown) { r.body = b; return r; } };
  await handler({ method: "POST", body }, r);
  return r;
};

beforeEach(() => {
  store.clear();
  sent.length = 0;
  messages.length = 0;
  invalidTokens = new Set();
  vi.useRealTimers();
  store.set("publicProfiles/bruno", { displayName: "Bruno Demo" });
  store.set("publicProfiles/ana", { displayName: "Ana Demo" });
  store.set("users/ana", { role: "athlete" });
  store.set("users/coach", { role: "admin" });
  store.set("users/ana/fcmTokens/tok-ana", { token: "tok-ana" });
  store.set("users/coach/fcmTokens/tok-coach", { token: "tok-coach" });
  store.set("timeline_posts/p1", { authorId: "ana", likedBy: ["bruno"], mentions: [{ id: "coach", name: "Coach Demo" }] });
  store.set("timeline_posts/p1/comments/c1", { authorId: "bruno", text: "Boa! @Ana Demo" });
  store.set("timeline_posts/p1/comments/c2", { authorId: "carla", text: "oi" });
});

describe("/api/notify-feed", () => {
  it("401 with an invalid token", async () => {
    expect((await call({ idToken: "bad", postId: "p1", kind: "like" })).code).toBe(401);
  });

  it("400 on a malformed request", async () => {
    expect((await call({ idToken: "bruno", postId: "p1", kind: "spam" })).code).toBe(400);
    expect((await call({ idToken: "bruno", postId: "a/b", kind: "like" })).code).toBe(400);
  });

  it("200 and a push to the post author for a real like", async () => {
    const r = await call({ idToken: "bruno", postId: "p1", kind: "like" });
    expect(r.code).toBe(200);
    expect(r.body).toEqual({ sent: 1 });
    expect(sent).toEqual(["tok-ana"]);
  });

  it("403 for a like that is not in likedBy, or a missing post", async () => {
    expect((await call({ idToken: "carla", postId: "p1", kind: "like" })).code).toBe(403);
    expect((await call({ idToken: "bruno", postId: "nope", kind: "like" })).code).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("200 for the caller's own comment; 403 for someone else's or a missing one", async () => {
    expect((await call({ idToken: "bruno", postId: "p1", kind: "comment", commentId: "c1" })).code).toBe(200);
    expect((await call({ idToken: "bruno", postId: "p1", kind: "comment", commentId: "c2" })).code).toBe(403);
    expect((await call({ idToken: "bruno", postId: "p1", kind: "comment", commentId: "zz" })).code).toBe(403);
    expect(sent).toEqual(["tok-ana"]);
  });

  it("mention in the author's post goes to the mentioned user; not in the post → 403", async () => {
    expect((await call({ idToken: "ana", postId: "p1", kind: "mention", mentionedUid: "coach" })).code).toBe(200);
    expect(sent).toEqual(["tok-coach"]);
    expect((await call({ idToken: "bruno", postId: "p1", kind: "mention", mentionedUid: "coach" })).code).toBe(403);
    expect((await call({ idToken: "ana", postId: "p1", kind: "mention", mentionedUid: "bruno" })).code).toBe(403);
  });

  it("mention in a comment must appear in the caller's comment text", async () => {
    expect((await call({ idToken: "bruno", postId: "p1", kind: "mention", mentionedUid: "ana", commentId: "c1" })).code).toBe(200);
    expect((await call({ idToken: "bruno", postId: "p1", kind: "mention", mentionedUid: "coach", commentId: "c1" })).code).toBe(403);
  });

  it("text: the title is who did it and the body says what, without repeating", async () => {
    await call({ idToken: "bruno", postId: "p1", kind: "comment", commentId: "c1" });
    expect(messages[0].notification).toEqual({ title: "Bruno Demo", body: "comentou: Boa! @Ana Demo" });
  });

  it("never pushes to yourself", async () => {
    store.set("timeline_posts/p2", { authorId: "ana", likedBy: ["ana"] });
    const r = await call({ idToken: "ana", postId: "p2", kind: "like" });
    expect(r.code).toBe(200);
    expect(r.body).toEqual({ sent: 0 });
    expect(sent).toHaveLength(0);
  });

  it("rate limit: one like push per post and liker per window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T10:00:00Z"));
    expect((await call({ idToken: "bruno", postId: "p1", kind: "like" })).body).toEqual({ sent: 1 });
    expect((await call({ idToken: "bruno", postId: "p1", kind: "like" })).body).toEqual({ sent: 0, throttled: true });
    vi.setSystemTime(Date.now() + THROTTLE_MS.like + 1);
    expect((await call({ idToken: "bruno", postId: "p1", kind: "like" })).body).toEqual({ sent: 1 });
    expect(sent).toEqual(["tok-ana", "tok-ana"]);
  });

  it("every comment notifies; the same comment never twice", async () => {
    store.set("timeline_posts/p1/comments/c3", { authorId: "bruno", text: "de novo" });
    expect((await call({ idToken: "bruno", postId: "p1", kind: "comment", commentId: "c1" })).body).toEqual({ sent: 1 });
    expect((await call({ idToken: "bruno", postId: "p1", kind: "comment", commentId: "c3" })).body).toEqual({ sent: 1 });
    expect((await call({ idToken: "bruno", postId: "p1", kind: "comment", commentId: "c3" })).body).toEqual({ sent: 0, throttled: true });
    expect((await call({ idToken: "bruno", postId: "p1", kind: "comment", commentId: "c1" })).body).toEqual({ sent: 0, throttled: true });
    expect(sent).toEqual(["tok-ana", "tok-ana"]);
  });

  it("removes invalid tokens and returns only generic errors", async () => {
    invalidTokens.add("tok-ana");
    expect((await call({ idToken: "bruno", postId: "p1", kind: "like" })).body).toEqual({ sent: 0 });
    expect(store.has("users/ana/fcmTokens/tok-ana")).toBe(false);

    const original = fakeDb.collection;
    fakeDb.collection = () => { throw new Error("secret internal detail"); };
    const r = await call({ idToken: "bruno", postId: "p1", kind: "like" });
    fakeDb.collection = original;
    expect(r.code).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("secret");
  });
});
