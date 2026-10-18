import type { SummaryHighlight, WorkoutSummary } from "@/types/timeline";
import type { AssignmentWithWorkout } from "@/types/workoutAssignment";
import {
  buildBestByExercise,
  computeStrengthVolume,
  isPersonalRecord,
  isWorkingSet,
  parseNum,
} from "@/utils/strengthStats";

/**
 * Workout card data for any completed assignment, so it can be shared at any
 * time — not only right after the session. Strength PRs are measured against
 * the sessions completed *before* this one.
 */
export const buildWorkoutSummary = (
  assignment: AssignmentWithWorkout,
  allAssignments: AssignmentWithWorkout[]
): WorkoutSummary => {
  const { workout } = assignment;
  const base: WorkoutSummary = {
    workoutName: workout.name,
    workoutType: workout.type,
    ...(assignment.rpe !== undefined ? { rpe: assignment.rpe } : {}),
  };

  if (workout.type !== "strength") {
    const a = assignment.activityData ?? {};
    return {
      ...base,
      ...(a.elapsedTime !== undefined ? { elapsedTime: a.elapsedTime } : {}),
      ...(a.distance !== undefined ? { distance: a.distance } : {}),
      ...(a.avgHeartRate !== undefined ? { avgHeartRate: a.avgHeartRate } : {}),
      ...(a.avgPace !== undefined ? { avgPace: a.avgPace } : {}),
      ...(a.avgSpeed !== undefined ? { avgSpeed: a.avgSpeed } : {}),
      ...(assignment.completionPercentage !== undefined && !a.elapsedTime
        ? { completionPercentage: assignment.completionPercentage }
        : {}),
    };
  }

  const progressData = assignment.progressData ?? [];
  const finishedAt = assignment.completedAt?.getTime() ?? Date.now();
  const earlier = allAssignments.filter(
    (a) => a.id !== assignment.id && a.completedAt && a.completedAt.getTime() < finishedAt
  );
  const best = buildBestByExercise(earlier);
  const nameOf = (exerciseId: string) =>
    workout.exercises?.find((we) => we.exerciseId === exerciseId)?.exerciseName || "";

  const { sets: workingSets, volume } = computeStrengthVolume(progressData);
  let records = 0;
  const highlights = progressData
    .map((ex) => {
      const top = ex.sets
        .filter((set) => isWorkingSet(set) && parseNum(set.weight) > 0)
        .sort((x, y) => parseNum(y.weight) - parseNum(x.weight) || parseNum(y.reps) - parseNum(x.reps))[0];
      if (!top) return null;
      const pr = isPersonalRecord(top, best.get(ex.exerciseId));
      if (pr) records += 1;
      return {
        name: nameOf(ex.exerciseId),
        value: `${top.weight} kg × ${top.reps || "–"}`,
        ...(pr ? { pr: true } : {}),
        weight: parseNum(top.weight),
      };
    })
    .filter((h): h is SummaryHighlight & { weight: number } => !!h && !!h.name)
    .sort((x, y) => Number(!!y.pr) - Number(!!x.pr) || y.weight - x.weight)
    .slice(0, 3)
    .map(({ weight: _weight, ...h }) => h);

  return {
    ...base,
    ...(assignment.totalTime ? { elapsedTime: assignment.totalTime } : {}),
    ...(assignment.completionPercentage !== undefined ? { completionPercentage: assignment.completionPercentage } : {}),
    volumeKg: Math.round(volume),
    workingSets,
    totalSets: progressData.reduce((sum, ex) => sum + ex.sets.length, 0),
    records,
    highlights,
  };
};
