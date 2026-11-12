#!/usr/bin/env node
/**
 * Backfill for the data-model change "team invites + public profiles".
 * See scripts/migrations/README.md before running it against a real project.
 *
 * Steps:
 *   --profiles      publicProfiles/{uid} = { displayName, photoURL, role } mirrored from users/{uid}
 *   --invites       teamInvites/{inviteToken} = { teamId, teamName, teamPhotoURL, coachId } from teams
 *   --blog-authors  (optional, separate) posts whose authorName is an e-mail get the
 *                   author's public name (publicProfiles, else users)
 * With no step flag: --profiles and --invites.
 *
 * DRY RUN BY DEFAULT: reads and reports what it would change. Writes only with --apply.
 * Idempotent: documents already in the desired state are left untouched.
 * Output has counts and document ids only: no e-mails, names of athletes or invite tokens.
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const PROJECT_ID = option("project");
const APPLY = flag("apply");
const explicitSteps = ["profiles", "invites", "blog-authors"].filter(flag);
const STEPS = explicitSteps.length ? explicitSteps : ["profiles", "invites"];
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;

const known = new Set(["--project", PROJECT_ID, "--apply", "--profiles", "--invites", "--blog-authors"]);
const unknown = args.filter((a) => !known.has(a));
if (!PROJECT_ID || unknown.length) {
  console.error(
    "Usage: node scripts/migrations/backfill-public-data.mjs --project <projectId> [--profiles] [--invites] [--blog-authors] [--apply]" +
      (unknown.length ? `\nUnknown argument(s): ${unknown.join(" ")}` : "")
  );
  process.exit(2);
}

initializeApp(EMULATOR ? { projectId: PROJECT_ID } : { projectId: PROJECT_ID, credential: applicationDefault() });
const db = getFirestore();

console.log(`Target: ${EMULATOR ? `emulator ${EMULATOR}` : "REAL PROJECT"} · project ${PROJECT_ID}`);
console.log(`Mode:   ${APPLY ? "APPLY (writes)" : "dry run (no writes; add --apply to write)"}`);
console.log(`Steps:  ${STEPS.join(", ")}\n`);

const writer = APPLY ? db.bulkWriter() : null;
const write = (ref, data, merge) => {
  if (writer) writer.set(ref, data, { merge });
};
const same = (a, b) => (a ?? null) === (b ?? null);
let problems = 0;

// ─── publicProfiles ───────────────────────────────────────────────────────────
async function backfillProfiles() {
  const [users, profiles] = await Promise.all([
    db.collection("users").get(),
    db.collection("publicProfiles").get(),
  ]);
  const existing = new Map(profiles.docs.map((d) => [d.id, d.data()]));
  const c = { create: 0, update: 0, ok: 0, orphan: 0 };

  for (const u of users.docs) {
    const data = u.data();
    const desired = {
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      role: data.role ?? null,
    };
    const current = existing.get(u.id);
    if (current && Object.keys(desired).every((k) => same(current[k], desired[k]))) {
      c.ok++;
      continue;
    }
    current ? c.update++ : c.create++;
    write(db.doc(`publicProfiles/${u.id}`), { ...desired, updatedAt: FieldValue.serverTimestamp() }, true);
  }
  const userIds = new Set(users.docs.map((d) => d.id));
  c.orphan = profiles.docs.filter((d) => !userIds.has(d.id)).length;

  console.log(`publicProfiles  users: ${users.size}`);
  console.log(`  create ${c.create} · update ${c.update} · already in sync ${c.ok}`);
  if (c.orphan) console.log(`  note: ${c.orphan} profile(s) without a users doc (left as is)`);
}

// ─── teamInvites ──────────────────────────────────────────────────────────────
async function backfillInvites() {
  const teams = await db.collection("teams").get();
  const c = { create: 0, update: 0, ok: 0, noToken: 0, conflict: 0 };

  for (const t of teams.docs) {
    const team = t.data();
    if (!team.inviteToken || typeof team.inviteToken !== "string" || team.inviteToken.includes("/")) {
      c.noToken++;
      console.log(`  skip team ${t.id}: no usable inviteToken`);
      continue;
    }
    const desired = {
      teamId: t.id,
      teamName: team.name ?? null,
      teamPhotoURL: team.photoURL ?? null,
      coachId: team.coachId ?? null,
    };
    const ref = db.doc(`teamInvites/${team.inviteToken}`);
    const snap = await ref.get();
    if (snap.exists && snap.data().teamId !== t.id) {
      c.conflict++;
      problems++;
      console.log(`  CONFLICT team ${t.id}: its invite token is already used by another team (left as is)`);
      continue;
    }
    if (snap.exists && Object.keys(desired).every((k) => same(snap.data()[k], desired[k]))) {
      c.ok++;
      continue;
    }
    snap.exists ? c.update++ : c.create++;
    write(
      ref,
      {
        ...desired,
        ...(snap.exists ? {} : { createdAt: team.createdAt ?? FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      true
    );
  }

  console.log(`teamInvites     teams: ${teams.size}`);
  console.log(`  create ${c.create} · update ${c.update} · already in sync ${c.ok}` +
    (c.noToken ? ` · no token ${c.noToken}` : "") + (c.conflict ? ` · conflicts ${c.conflict}` : ""));
}

// ─── blog authors (optional) ──────────────────────────────────────────────────
async function fixBlogAuthors() {
  const posts = await db.collection("posts").get();
  const c = { fix: 0, noName: 0 };
  const nameCache = new Map();
  const publicNameOf = async (uid) => {
    if (!uid) return null;
    if (nameCache.has(uid)) return nameCache.get(uid);
    const prof = await db.doc(`publicProfiles/${uid}`).get();
    let name = prof.exists ? prof.data().displayName : null;
    if (!name) {
      const user = await db.doc(`users/${uid}`).get();
      name = user.exists ? user.data().displayName : null;
    }
    const clean = typeof name === "string" && name.trim() && !name.includes("@") ? name.trim() : null;
    nameCache.set(uid, clean);
    return clean;
  };

  const withEmail = posts.docs.filter((p) => String(p.data().authorName ?? "").includes("@"));
  for (const p of withEmail) {
    const name = await publicNameOf(p.data().authorId);
    if (!name) {
      c.noName++;
      problems++;
      console.log(`  posts/${p.id}: skip (author has no public name)`);
      continue;
    }
    c.fix++;
    // The e-mail itself is never printed
    console.log(`  posts/${p.id}: e-mail → ${name}`);
    write(p.ref, { authorName: name }, true);
  }

  console.log(`blog authors    posts: ${posts.size} · with e-mail: ${withEmail.length}`);
  console.log(`  fix ${c.fix}` + (c.noName ? ` · no public name ${c.noName}` : ""));
}

// Profiles first: the blog step reads them.
if (STEPS.includes("profiles")) await backfillProfiles();
if (STEPS.includes("invites")) await backfillInvites();
if (STEPS.includes("blog-authors")) {
  if (APPLY && STEPS.includes("profiles")) await writer.flush();
  await fixBlogAuthors();
}

if (writer) await writer.close();
console.log(`\n${APPLY ? "Done: changes written." : "Dry run: nothing written."}` +
  (problems ? ` ${problems} item(s) need attention (see above).` : ""));
process.exit(problems ? 1 : 0);
