import type { SetProgressData } from "@/types/workoutAssignment";

/**
 * In-progress strength session, persisted on the device after every change
 * so a killed PWA (iOS does this often in the background), a reload or a dead
 * battery doesn't lose the workout.
 */
export interface SessionDraft {
  /** Epoch ms when the session (re)started; elapsed = now - startedAt */
  startedAt: number;
  /** Keyed by workoutExercise.id */
  progress: Record<string, { exerciseId: string; sets: SetProgressData[] }>;
  rest: RestState | null;
  updatedAt: number;
}

export interface RestState {
  /** Epoch ms when the rest ends */
  endsAt: number;
  durationSec: number;
  /** workoutExercise.id + set index the athlete should do next */
  nextExerciseId: string;
  nextSetIndex: number;
}

// Drafts older than this are treated as abandoned
const MAX_DRAFT_AGE_MS = 12 * 60 * 60 * 1000;

const keyFor = (assignmentId: string) => `strength-session:${assignmentId}`;

export const loadSessionDraft = (assignmentId: string): SessionDraft | null => {
  try {
    const raw = localStorage.getItem(keyFor(assignmentId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as SessionDraft;
    if (!draft.startedAt || Date.now() - draft.updatedAt > MAX_DRAFT_AGE_MS) {
      localStorage.removeItem(keyFor(assignmentId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
};

export const saveSessionDraft = (assignmentId: string, draft: Omit<SessionDraft, "updatedAt">) => {
  try {
    localStorage.setItem(keyFor(assignmentId), JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    // Storage full or blocked (private mode): the session still works, just without recovery
  }
};

/** Share of sets ticked and minutes on the clock, for a "Resume workout" CTA. */
export const getDraftProgress = (draft: SessionDraft) => {
  const sets = Object.values(draft.progress).flatMap((p) => p.sets);
  const done = sets.filter((s) => s.completed).length;
  return {
    percent: sets.length ? Math.round((done / sets.length) * 100) : 0,
    minutes: Math.max(0, Math.floor((Date.now() - draft.startedAt) / 60000)),
  };
};

export const clearSessionDraft =(assignmentId: string) => {
  try {
    localStorage.removeItem(keyFor(assignmentId));
  } catch {
    // ignore
  }
};
