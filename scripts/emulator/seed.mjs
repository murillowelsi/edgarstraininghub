#!/usr/bin/env node
/**
 * Seed the LOCAL Firebase emulator with fictional demo data.
 *
 *   npm run emulators   # terminal 1
 *   npm run seed        # terminal 2
 *
 * - Idempotent: fixed uids and doc ids, so running it again overwrites the
 *   same documents (dates are recomputed relative to today).
 * - Refuses to run unless it talks to the emulator with a demo-* project.
 * - Every name, e-mail and number here is invented. Never add real data.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const PROJECT_ID = process.env.EMULATOR_PROJECT_ID || "demo-ez";
const HOST = process.env.EMULATOR_HOST || "127.0.0.1";
// Ports must match "emulators" in firebase.json.
process.env.FIRESTORE_EMULATOR_HOST ||= `${HOST}:8081`;
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= `${HOST}:9099`;
process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= `${HOST}:9199`;

if (!PROJECT_ID.startsWith("demo-")) {
  console.error(`Refusing to seed: project "${PROJECT_ID}" is not a demo-* project.`);
  process.exit(1);
}
// Clear any service-account path so firebase-admin can never pick up real credentials.
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Fail fast with a clear message when the emulator is not running.
try {
  const res = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (e) {
  console.error(
    `Firestore emulator not reachable at ${process.env.FIRESTORE_EMULATOR_HOST}. Start it with "npm run emulators".`,
  );
  process.exit(1);
}

// ─── Dates ────────────────────────────────────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);
const addDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
};
const at = (dayOffset, hours = 9, minutes = 0) => {
  const d = addDays(dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d;
};
const ts = (date) => Timestamp.fromDate(date);
const dayString = (date) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};
const NOW = ts(new Date());

// ─── Users (Auth + users/{uid}) ───────────────────────────────────────────────
const PASSWORD = "ez-demo-123"; // emulator only
const COACH = "demo-coach";
const ANA = "demo-athlete-ana";
const BRUNO = "demo-athlete-bruno";
const CARLA = "demo-athlete-carla";
const DIEGO = "demo-athlete-diego";

const users = [
  { uid: COACH, email: "coach@ez.test", displayName: "Coach Demo", role: "admin", status: "active", plan: "none" },
  { uid: ANA, email: "ana@ez.test", displayName: "Ana Teste", role: "athlete", status: "active", plan: "monthly" },
  { uid: BRUNO, email: "bruno@ez.test", displayName: "Bruno Teste", role: "athlete", status: "active", plan: "quarterly" },
  { uid: CARLA, email: "carla@ez.test", displayName: "Carla Teste", role: "athlete", status: "trial", plan: "monthly" },
  // Not in the team, subscription lapsed: covers the "lapsed" state in the coach dashboard.
  { uid: DIEGO, email: "diego@ez.test", displayName: "Diego Teste", role: "athlete", status: "expired", plan: "yearly" },
];
const nameOf = Object.fromEntries(users.map((u) => [u.uid, u.displayName]));

async function upsertAuthUser(u) {
  const props = { email: u.email, password: PASSWORD, displayName: u.displayName, emailVerified: true };
  try {
    await auth.updateUser(u.uid, props);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    await auth.createUser({ uid: u.uid, ...props });
  }
}

// ─── Exercise library ────────────────────────────────────────────────────────
const exercises = [
  { id: "demo-ex-squat", name: "Agachamento livre", muscleGroups: ["quadriceps", "glutes"], equipment: ["barbell"] },
  { id: "demo-ex-rdl", name: "Levantamento terra romeno", muscleGroups: ["hamstrings", "glutes"], equipment: ["barbell"] },
  { id: "demo-ex-lunge", name: "Avanço com halteres", muscleGroups: ["quadriceps", "glutes"], equipment: ["dumbbell"] },
  { id: "demo-ex-bench", name: "Supino reto", muscleGroups: ["chest", "triceps"], equipment: ["barbell", "bench"] },
  { id: "demo-ex-row", name: "Remada curvada", muscleGroups: ["back", "biceps"], equipment: ["barbell"] },
  { id: "demo-ex-plank", name: "Prancha", muscleGroups: ["core"], equipment: ["bodyweight"] },
];
const exById = Object.fromEntries(exercises.map((e) => [e.id, e]));

// ─── Workouts ────────────────────────────────────────────────────────────────
const wx = (order, exerciseId, sets, reps, weight, restSeconds, extra = {}) => ({
  id: `${exerciseId}-${order}`,
  exerciseId,
  sets,
  reps,
  weight,
  restSeconds,
  order,
  exerciseName: exById[exerciseId].name,
  exerciseMuscleGroups: exById[exerciseId].muscleGroups,
  ...extra,
});
const stage = (id, type, duration, intensity = { type: "none" }, extra = {}) => ({ id, type, duration, intensity, ...extra });

const workouts = [
  {
    id: "demo-wk-strength-lower",
    name: "Força A: membros inferiores",
    type: "strength",
    stages: [],
    notes: "Foco em técnica. Última série perto da falha (RPE 8).",
    exercises: [
      wx(0, "demo-ex-squat", 4, "8", "60", 120),
      wx(1, "demo-ex-rdl", 3, "10", "50", 90),
      wx(2, "demo-ex-lunge", 3, "10-12", "12", 60),
      wx(3, "demo-ex-plank", 3, "45s", undefined, 45),
    ],
  },
  {
    id: "demo-wk-strength-upper",
    name: "Força B: membros superiores",
    type: "strength",
    stages: [],
    exercises: [
      wx(0, "demo-ex-bench", 4, "6-8", "45", 120),
      wx(1, "demo-ex-row", 4, "8-10", "40", 90),
      wx(2, "demo-ex-plank", 2, "1 min", undefined, 30),
    ],
  },
  {
    id: "demo-wk-run-intervals",
    name: "Corrida: intervalado 5 × 800 m",
    type: "running",
    notes: "Recuperação trotando leve.",
    stages: [
      stage("run-wu", "warmup", { type: "time", value: 15, unit: "min" }, { type: "heartRateZone", value: 2 }),
      stage("run-rep", "repeat", { type: "lapButton" }, { type: "none" }, {
        repeatCount: 5,
        stages: [
          stage("run-int", "interval", { type: "distance", value: 800, unit: "m" }, { type: "pace", min: 4.3, max: 4.45, unit: "min/km" }),
          stage("run-rec", "recovery", { type: "time", value: 90, unit: "sec" }),
        ],
      }),
      stage("run-cd", "cooldown", { type: "time", value: 10, unit: "min" }),
    ],
  },
  {
    id: "demo-wk-bike-endurance",
    name: "Bike: endurance Z2",
    type: "cycling",
    stages: [
      stage("bike-wu", "warmup", { type: "time", value: 10, unit: "min" }),
      stage("bike-main", "bike", { type: "time", value: 60, unit: "min" }, { type: "powerZone", value: 2 }),
      stage("bike-cd", "cooldown", { type: "time", value: 10, unit: "min" }),
    ],
  },
  {
    id: "demo-wk-swim-technique",
    name: "Natação: técnica e ritmo",
    type: "swimming",
    stages: [
      stage("swim-wu", "warmup", { type: "distance", value: 300, unit: "m" }, { type: "none" }, { strokeType: "choice" }),
      stage("swim-rep", "repeat", { type: "lapButton" }, { type: "none" }, {
        repeatCount: 6,
        stages: [
          stage("swim-int", "swim", { type: "distance", value: 100, unit: "m" }, { type: "effortBased", value: 7 }, { strokeType: "freestyle", equipment: "paddles" }),
          stage("swim-rest", "rest", { type: "time", value: 20, unit: "sec" }),
        ],
      }),
      stage("swim-cd", "cooldown", { type: "distance", value: 200, unit: "m" }, { type: "none" }, { strokeType: "backstroke" }),
    ],
  },
];
const workoutById = Object.fromEntries(workouts.map((w) => [w.id, w]));

// ─── Assignments ─────────────────────────────────────────────────────────────
const sets = (n, reps, weight, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ setNumber: i + 1, reps: String(reps), weight: String(weight), completed: true, ...extra }));

const strengthLowerProgress = (load) => [
  { exerciseId: "demo-ex-squat", sets: [{ setNumber: 1, reps: "10", weight: "30", completed: true, warmup: true }, ...sets(4, 8, load).map((s, i) => ({ ...s, setNumber: i + 2 }))] },
  { exerciseId: "demo-ex-rdl", sets: sets(3, 10, load - 10) },
  { exerciseId: "demo-ex-lunge", sets: sets(3, 12, 12) },
  { exerciseId: "demo-ex-plank", sets: sets(3, "45s", "", { time: 45 }) },
];

const assignments = [];
const assign = (id, athleteId, workoutId, dayOffset, extra = {}) => {
  const date = addDays(dayOffset);
  assignments.push({
    id,
    workoutId,
    athleteId,
    scheduledDate: ts(date),
    scheduledDay: dayString(date),
    assignedBy: COACH,
    completedAt: null,
    createdAt: ts(addDays(Math.min(dayOffset, 0) - 3)),
    updatedAt: NOW,
    ...extra,
  });
};
const done = (dayOffset, hours, extra) => ({ completedAt: ts(at(dayOffset, hours)), completionPercentage: 100, ...extra });

for (const [athleteId, load, key] of [[ANA, 55, "ana"], [BRUNO, 70, "bruno"], [CARLA, 40, "carla"]]) {
  // Past, completed
  assign(`demo-as-${key}-str-a1`, athleteId, "demo-wk-strength-lower", -9,
    done(-9, 7, { totalTime: 3300, progressData: strengthLowerProgress(load - 5), rpe: 7, athleteNotes: "Agachamento fluiu bem, lombar ok." }));
  assign(`demo-as-${key}-str-a2`, athleteId, "demo-wk-strength-lower", -2,
    done(-2, 7, { totalTime: 3480, progressData: strengthLowerProgress(load), rpe: 8, athleteNotes: "Subi a carga no agachamento. Última série pesada." }));
  assign(`demo-as-${key}-run-1`, athleteId, "demo-wk-run-intervals", -6,
    done(-6, 18, {
      totalTime: 3120,
      rpe: 8,
      athleteNotes: "Tiros 4 e 5 mais difíceis, calor.",
      activityData: {
        elapsedTime: 3120, distance: 10.2, avgHeartRate: 152, avgPace: 306,
        stageTimes: [
          { stageIndex: 0, time: 900 },
          { stageIndex: 1, reps: [200, 202, 204, 206, 209].map((t) => ({ times: [t, 90] })) },
          { stageIndex: 2, time: 600 },
        ],
      },
    }));
  assign(`demo-as-${key}-bike-1`, athleteId, "demo-wk-bike-endurance", -4,
    done(-4, 8, { totalTime: 4800, rpe: 5, activityData: { elapsedTime: 4800, distance: 38.5, avgHeartRate: 138, avgSpeed: 28.9, avgPower: 182 } }));
  // Today and future
  assign(`demo-as-${key}-swim-today`, athleteId, "demo-wk-swim-technique", 0);
  assign(`demo-as-${key}-str-b1`, athleteId, "demo-wk-strength-upper", 1);
  assign(`demo-as-${key}-run-2`, athleteId, "demo-wk-run-intervals", 3);
  assign(`demo-as-${key}-str-a3`, athleteId, "demo-wk-strength-lower", 5);
}
// Variations: one skipped, one partial, one self-logged
assign("demo-as-ana-swim-skipped", ANA, "demo-wk-swim-technique", -7, { skipped: true });
assign("demo-as-bruno-str-b-partial", BRUNO, "demo-wk-strength-upper", -5,
  done(-5, 19, { completionPercentage: 60, totalTime: 1800, rpe: 6, athleteNotes: "Saí mais cedo, dor no ombro.",
    progressData: [{ exerciseId: "demo-ex-bench", sets: sets(4, 8, 45) }, { exerciseId: "demo-ex-row", sets: sets(2, 10, 40) }] }));
assign("demo-as-carla-run-selflog", CARLA, "demo-wk-run-intervals", -3,
  done(-3, 6, { selfLogged: true, totalTime: 2700, rpe: 6, activityData: { elapsedTime: 2700, distance: 8.1, avgHeartRate: 147, avgPace: 333 } }));
// Diego: old history only
assign("demo-as-diego-run-old", DIEGO, "demo-wk-run-intervals", -40,
  done(-40, 7, { totalTime: 3000, rpe: 7, activityData: { elapsedTime: 3000, distance: 9.8, avgHeartRate: 155, avgPace: 312 } }));

// ─── Team ────────────────────────────────────────────────────────────────────
const TEAM_ID = "demo-team-tri";
const INVITE_TOKEN = "demo-invite-token";
const team = {
  name: "Equipe Tri Demo",
  color: "#3b82f6",
  coachId: COACH,
  inviteToken: INVITE_TOKEN,
  memberIds: [ANA, BRUNO, CARLA],
  assignedWorkouts: [
    { workoutId: "demo-wk-run-intervals", scheduledDate: ts(addDays(3)), scheduledDay: dayString(addDays(3)) },
    { workoutId: "demo-wk-strength-lower", scheduledDate: ts(addDays(5)), scheduledDay: dayString(addDays(5)) },
  ],
  createdAt: ts(addDays(-60)),
  updatedAt: NOW,
};

// ─── Chats ───────────────────────────────────────────────────────────────────
const chats = [];
const chat = (id, base, messages) => {
  const last = messages[messages.length - 1];
  chats.push({
    id,
    // The app stores `id` inside the chat doc (ChatService.createOrGet*), and
    // createOrGetChat returns the doc data as the chat, so keep it here too.
    data: { id, ...base, lastMessage: last.text, lastMessageTime: ts(last.at) },
    messages: messages.map((m, i) => ({
      id: `m${String(i + 1).padStart(2, "0")}`,
      data: { text: m.text, senderId: m.from, senderName: nameOf[m.from], createdAt: ts(m.at), read: m.read ?? true },
    })),
  });
};
for (const [athleteId, key] of [[ANA, "ana"], [BRUNO, "bruno"], [CARLA, "carla"]]) {
  const unread = key === "ana";
  chat(`${athleteId}_${COACH}`, {
    participantIds: [COACH, athleteId],
    athleteId,
    athleteName: nameOf[athleteId],
    unreadCount: { [COACH]: unread ? 1 : 0, [athleteId]: 0 },
  }, [
    { from: COACH, text: "Bom dia! Viu o treino de amanhã?", at: at(-2, 8, 5) },
    { from: athleteId, text: "Vi sim. Posso trocar a bike para sábado?", at: at(-2, 9, 12) },
    { from: COACH, text: "Pode. Só não faz no mesmo dia do intervalado.", at: at(-2, 9, 30) },
    { from: athleteId, text: "Fechado, obrigado!", at: at(-1, 20, 40), read: !unread },
  ]);
}
chat(`team_${TEAM_ID}`, {
  participantIds: [COACH, ANA, BRUNO, CARLA],
  isGroup: true,
  teamId: TEAM_ID,
  groupName: team.name,
  unreadCount: { [COACH]: 0, [ANA]: 2, [BRUNO]: 0, [CARLA]: 1 },
}, [
  { from: COACH, text: "Pessoal, treino coletivo de corrida no sábado às 7h.", at: at(-1, 10) },
  { from: BRUNO, text: "Tô dentro 💪", at: at(-1, 10, 20) },
  { from: CARLA, text: "Vou também. Alguém dá carona?", at: at(-1, 11, 5), read: false },
  { from: COACH, text: "Levem gel e água, vai ser 1h15.", at: at(0, 7, 30), read: false },
]);

// ─── Timeline ────────────────────────────────────────────────────────────────
const posts = [
  {
    id: "demo-tl-ana-strength",
    data: {
      authorId: ANA, authorName: nameOf[ANA], authorRole: "athlete",
      caption: "Workout complete: Força A", captionAuto: true,
      imageUrls: [], mentions: [], assignmentId: "demo-as-ana-str-a2",
      workoutSummary: {
        workoutName: workoutById["demo-wk-strength-lower"].name, workoutType: "strength",
        elapsedTime: 3480, completionPercentage: 100, volumeKg: 4310, workingSets: 13, totalSets: 14, records: 1, rpe: 8,
        highlights: [{ name: "Agachamento livre", value: "55 kg × 8", pr: true }, { name: "Levantamento terra romeno", value: "45 kg × 10" }],
      },
      likedBy: [COACH, BRUNO],
      createdAt: ts(at(-2, 8, 10)),
    },
    comments: [
      { from: COACH, text: "Boa, Ana! Recorde no agachamento 👏", at: at(-2, 9) },
      { from: BRUNO, text: "Monstra!", at: at(-2, 9, 30), likedBy: [ANA] },
    ],
  },
  {
    id: "demo-tl-bruno-run",
    data: {
      authorId: BRUNO, authorName: nameOf[BRUNO], authorRole: "athlete",
      caption: "Intervalado com calor de 30 graus. @Carla Teste, sábado tem mais.",
      imageUrls: [], mentions: [{ id: CARLA, name: nameOf[CARLA] }], assignmentId: "demo-as-bruno-run-1",
      workoutSummary: {
        workoutName: workoutById["demo-wk-run-intervals"].name, workoutType: "running",
        elapsedTime: 3120, distance: 10.2, avgHeartRate: 152, avgPace: 306, rpe: 8,
      },
      likedBy: [ANA, CARLA, COACH],
      createdAt: ts(at(-6, 19)),
    },
    comments: [{ from: CARLA, text: "Bora! Levo o isotônico.", at: at(-6, 20) }],
  },
  {
    id: "demo-tl-coach-announcement",
    data: {
      authorId: COACH, authorName: nameOf[COACH], authorRole: "admin",
      caption: "Semana de recuperação a partir de segunda. Volume menor, sono em dia. 😴",
      imageUrls: [], mentions: [], likedBy: [ANA], createdAt: ts(at(-1, 12)),
    },
    comments: [],
  },
];
for (const p of posts) {
  p.data.commentsCount = p.comments.length;
  p.data.updatedAt = p.data.createdAt;
}
const notifications = [
  { uid: ANA, id: "demo-notif-ana-like", postId: "demo-tl-ana-strength", data: { authorName: nameOf[COACH], actorId: COACH, type: "like", read: false, createdAt: ts(at(-2, 8, 30)) } },
  { uid: ANA, id: "demo-notif-ana-comment", postId: "demo-tl-ana-strength", data: { authorName: nameOf[COACH], actorId: COACH, type: "comment", read: false, createdAt: ts(at(-2, 9)) } },
  { uid: CARLA, id: "demo-notif-carla-mention", postId: "demo-tl-bruno-run", data: { authorName: nameOf[BRUNO], type: "mention", caption: "Intervalado com calor de 30 graus.", read: true, createdAt: ts(at(-6, 19)) } },
];

// ─── Athlete events ──────────────────────────────────────────────────────────
const events = [
  {
    id: "demo-ev-ana-70", data: {
      athleteId: ANA, title: "Triathlon 70.3 (fictício)", eventDate: ts(addDays(45)), type: "race",
      description: "Prova-alvo da temporada.",
      goals: [{ id: "g1", text: "Terminar abaixo de 5h45", achieved: false }, { id: "g2", text: "Natação sem parar", achieved: false }],
    },
  },
  {
    id: "demo-ev-bruno-10k", data: {
      athleteId: BRUNO, title: "Corrida 10 km (fictícia)", eventDate: ts(addDays(12)), type: "race",
      goals: [{ id: "g1", text: "Sub 45 min", achieved: false }],
    },
  },
  {
    id: "demo-ev-carla-test", data: {
      athleteId: CARLA, title: "Teste de limiar", eventDate: ts(addDays(-10)), type: "test",
      goals: [{ id: "g1", text: "Completar 30 min", achieved: true }],
    },
  },
];

// ─── Public site: testimonials and blog ──────────────────────────────────────
const testimonials = [
  { id: "demo-tm-1", data: { name: "Paula Exemplo", role: "Triatleta amadora", text: "Treinos organizados e acompanhamento de perto. Melhorei 20 min no 70.3.", stars: 5, source: "manual", approved: true } },
  { id: "demo-tm-2", data: { name: "Marcos Fictício", role: "Corredor", text: "Ótimo equilíbrio entre força e corrida, zero lesões na temporada.", stars: 5, source: "manual", approved: true } },
  { id: "demo-tm-ana", data: { name: nameOf[ANA], role: "Atleta", text: "O app facilita muito ver o treino do dia.", stars: 4, source: "athlete", athleteId: ANA, approved: false } },
];
const blogPosts = [
  {
    id: "demo-post-1", data: {
      title: "Como dosar o treino de força no triathlon", slug: "forca-no-triathlon",
      excerpt: "Duas sessões por semana bastam. Veja como encaixar sem atrapalhar a corrida.",
      content: "<h2>Por que treinar força</h2><p>Texto de exemplo para o ambiente de teste.</p><ul><li>Prevenção de lesões</li><li>Economia de corrida</li></ul>",
      published: true, authorId: COACH, authorName: nameOf[COACH], createdAt: ts(at(-20, 10)),
    },
  },
  {
    id: "demo-post-2", data: {
      title: "Hidratação em dias quentes", slug: "hidratacao-dias-quentes",
      excerpt: "Um guia simples para não errar na água e nos sais.",
      content: "<p>Conteúdo fictício de exemplo.</p>",
      published: true, authorId: COACH, authorName: nameOf[COACH], createdAt: ts(at(-8, 10)),
    },
  },
  {
    id: "demo-post-draft", data: {
      title: "Rascunho: periodização para iniciantes", slug: "periodizacao-iniciantes",
      excerpt: "Rascunho ainda não publicado.", content: "<p>Em construção.</p>",
      published: false, authorId: COACH, authorName: nameOf[COACH], createdAt: ts(at(-1, 10)),
    },
  },
];

// ─── Write ───────────────────────────────────────────────────────────────────
for (const u of users) await upsertAuthUser(u);

const writer = db.bulkWriter();
const put = (ref, data) => writer.set(ref, data);

for (const u of users) {
  put(db.doc(`users/${u.uid}`), {
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    subscriptionStatus: u.status,
    subscriptionPlan: u.plan,
    ...(u.role === "athlete" && {
      subscriptionStartDate: ts(addDays(u.status === "expired" ? -400 : -60)),
      subscriptionEndDate: ts(addDays(u.status === "expired" ? -35 : u.status === "trial" ? 7 : 30)),
    }),
    createdAt: ts(addDays(-90)),
    updatedAt: NOW,
  });
}
for (const u of users.filter((x) => x.role === "athlete")) {
  put(db.doc(`subscriptionHistory/demo-sub-${u.uid}`), {
    athleteId: u.uid, plan: u.plan, status: u.status,
    startDate: ts(addDays(u.status === "expired" ? -400 : -60)),
    endDate: ts(addDays(u.status === "expired" ? -35 : 30)),
    paymentAmount: 199, currency: "BRL", paymentMethod: "pix", notes: "Valor fictício",
    createdAt: ts(addDays(-60)), createdBy: COACH,
  });
}
for (const e of exercises) {
  const { id, ...rest } = e;
  put(db.doc(`exercises/${id}`), { ...rest, isCustom: true, createdBy: COACH, createdAt: ts(addDays(-90)), updatedAt: NOW });
}
for (const w of workouts) {
  const { id, ...rest } = w;
  put(db.doc(`workouts/${id}`), { ...rest, authorId: COACH, createdAt: ts(addDays(-80)), updatedAt: NOW });
}
for (const a of assignments) {
  const { id, ...rest } = a;
  put(db.doc(`workoutAssignments/${id}`), rest);
}
put(db.doc(`teams/${TEAM_ID}`), team);
for (const c of chats) {
  put(db.doc(`chats/${c.id}`), c.data);
  for (const m of c.messages) put(db.doc(`chats/${c.id}/messages/${m.id}`), m.data);
}
for (const p of posts) {
  put(db.doc(`timeline_posts/${p.id}`), p.data);
  p.comments.forEach((c, i) => {
    put(db.doc(`timeline_posts/${p.id}/comments/c${i + 1}`), {
      authorId: c.from, authorName: nameOf[c.from], authorRole: c.from === COACH ? "admin" : "athlete",
      text: c.text, likedBy: c.likedBy ?? [], createdAt: ts(c.at),
    });
  });
}
for (const n of notifications) {
  put(db.doc(`users/${n.uid}/timelineNotifications/${n.id}`), { postId: n.postId, ...n.data });
  put(db.doc(`timeline_posts/${n.postId}/notificationRefs/${n.id}`), { userId: n.uid, notificationId: n.id });
}
for (const e of events) put(db.doc(`athleteEvents/${e.id}`), { ...e.data, createdAt: ts(addDays(-30)), updatedAt: NOW });
for (const t of testimonials) put(db.doc(`testimonials/${t.id}`), { ...t.data, createdAt: ts(addDays(-15)), updatedAt: NOW });
for (const p of blogPosts) put(db.doc(`posts/${p.id}`), { ...p.data, updatedAt: p.data.createdAt });

await writer.close();

console.log(`Seeded project ${PROJECT_ID} (emulator ${process.env.FIRESTORE_EMULATOR_HOST}):`);
console.log(`  ${users.length} users, ${workouts.length} workouts, ${assignments.length} assignments, ${chats.length} chats, ${posts.length} timeline posts`);
console.log(`  Logins (password for all: ${PASSWORD}):`);
for (const u of users) console.log(`    ${u.role.padEnd(8)} ${u.email}`);
console.log(`  Team invite: /join/${INVITE_TOKEN}`);
process.exit(0);
