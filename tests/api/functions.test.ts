/**
 * Vercel functions api/notify.js and api/rest-timer.js with the Firebase Admin
 * SDK mocked (no credentials, no network). Fictional ids only.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Fake Admin SDK ───────────────────────────────────────────────────────────
const chats: Record<string, { participantIds: string[] }> = {
  a_coach: { participantIds: ["coach", "a"] },
  team_t1: { participantIds: ["coach", "a", "b"] },
};
const sent: string[] = [];
const timers: Record<string, unknown> = {};
const waitUntilCalls: Promise<unknown>[] = [];

const fakeDb = {
  collection: (c: string) => ({
    doc: (id: string) => ({
      get: async () =>
        c === "chats"
          ? { exists: !!chats[id], data: () => chats[id] }
          : { exists: true, data: () => ({ role: "athlete", ...(timers[id] as object) }) },
      set: async (data: unknown) => {
        if (c === "restTimers") timers[id] = data;
      },
      collection: () => ({
        get: async () => ({ empty: false, docs: [{ data: () => ({ token: `tok-${id}` }) }] }),
        doc: () => ({}),
      }),
    }),
    where: () => ({ get: async () => ({ forEach: () => {} }) }),
  }),
  batch: () => ({ delete() {}, commit: async () => {} }),
};

vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn(), getApps: () => [{}], cert: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => fakeDb }));
vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => ({ send: async (m: { token: string }) => { sent.push(m.token); } }),
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    verifyIdToken: async (t: string) => {
      if (t === "bad") throw new Error("invalid");
      return { uid: t }; // the test token is the uid
    },
  }),
}));
vi.mock("@vercel/functions", () => ({
  waitUntil: (p: Promise<unknown>) => { waitUntilCalls.push(p); },
}));

const res = () => {
  const r = {
    code: 0,
    body: null as unknown,
    status(c: number) { r.code = c; return r; },
    json(b: unknown) { r.body = b; return r; },
  };
  return r;
};

// @ts-expect-error plain JS module without types
const { default: notify } = await import("../../api/notify.js");
// @ts-expect-error plain JS module without types
const { default: restTimer } = await import("../../api/rest-timer.js");

beforeEach(() => {
  sent.length = 0;
  waitUntilCalls.length = 0;
});

describe("/api/notify", () => {
  const post = async (body: Record<string, unknown>) => {
    const r = res();
    await notify({ method: "POST", body }, r);
    return r;
  };
  const base = { chatId: "a_coach", messageText: "hi", recipientId: "coach", idToken: "a" };

  it("401 with an invalid token", async () => {
    expect((await post({ ...base, idToken: "bad" })).code).toBe(401);
  });

  it("400 without a token", async () => {
    expect((await post({ ...base, idToken: undefined })).code).toBe(400);
  });

  it("403 when the sender is not in the chat", async () => {
    const r = await post({ ...base, idToken: "outsider" });
    expect(r.code).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("403 when the recipient is not in the chat", async () => {
    expect((await post({ ...base, recipientId: "b" })).code).toBe(403);
  });

  it("200 and one push on the happy path (1:1 and team chat)", async () => {
    const r = await post(base);
    expect(r.code).toBe(200);
    expect(r.body).toEqual({ sent: 1 });
    expect((await post({ ...base, chatId: "team_t1", recipientId: "b" })).code).toBe(200);
  });

  it("405 for GET", async () => {
    const r = res();
    await notify({ method: "GET" }, r);
    expect(r.code).toBe(405);
  });
});

describe("/api/rest-timer", () => {
  const post = async (body: Record<string, unknown>) => {
    const r = res();
    await restTimer({ method: "POST", body }, r);
    return r;
  };

  it("401 with an invalid token", async () => {
    expect((await post({ action: "cancel", idToken: "bad" })).code).toBe(401);
  });

  it("202 on start and the push goes to the caller's own tokens", async () => {
    const r = await post({ action: "start", idToken: "a", timerId: "t1", delaySec: 0, title: "Rest over" });
    expect(r.code).toBe(202);
    await Promise.all(waitUntilCalls);
    expect(sent).toEqual(["tok-a"]);
  });

  it("200 on cancel", async () => {
    expect((await post({ action: "cancel", idToken: "a" })).code).toBe(200);
  });

  it("400 on an invalid start", async () => {
    expect((await post({ action: "start", idToken: "a" })).code).toBe(400);
  });
});
