/** pushThrottle/{key} is written only by /api/notify-feed (Admin SDK); clients have no access. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8081").split(":");
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ez-rules",
    firestore: { host, port: Number(port), rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8") },
  });
});
afterAll(async () => { await env?.cleanup(); });

describe("pushThrottle", () => {
  it("a signed-in user cannot read, reset or delete the push rate limit", async () => {
    const db = env.authenticatedContext("bruno").firestore();
    const ref = doc(db, "pushThrottle", "like_p1_bruno");
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, { sentAt: 0 }));
    await assertFails(deleteDoc(ref));
  });
});
