import type { WorkoutBlockDto, WorkoutStepDto, WorkoutTemplateResponse } from '@/types/api';

const secondsPerRep = 5;

export const estimateWorkoutStepSeconds = (step: WorkoutStepDto) => {
  if (step.stepType === 'BREAK' || step.measurementType === 'TIME') {
    return Math.max(0, step.durationSeconds ?? 0);
  }
  return Math.max(0, step.reps ?? 0) * secondsPerRep;
};

export const estimateWorkoutBlockSeconds = (block: WorkoutBlockDto) => {
  const repeat = Math.max(1, block.repeatCount || 1);
  const singleLapSeconds = block.steps.reduce((total, step) => total + estimateWorkoutStepSeconds(step), 0);
  return singleLapSeconds * repeat;
};

export const estimateWorkoutTemplateSeconds = (template: Pick<WorkoutTemplateResponse, 'steps' | 'blocks' | 'exercises'>) => {
  const topLevelSeconds = (template.steps ?? []).reduce((total, step) => total + estimateWorkoutStepSeconds(step), 0);
  const blockSeconds = (template.blocks ?? []).reduce((total, block) => total + estimateWorkoutBlockSeconds(block), 0);
  const advancedSeconds = topLevelSeconds + blockSeconds;
  if (advancedSeconds > 0 || (template.steps?.length ?? 0) > 0 || (template.blocks?.length ?? 0) > 0) {
    return advancedSeconds;
  }

  return (template.exercises ?? []).reduce((total, exercise) => {
    const parsedReps = Number.parseInt(exercise.reps ?? '', 10);
    const repsSeconds = Number.isFinite(parsedReps) && parsedReps > 0 ? parsedReps * secondsPerRep : 0;
    const sets = Math.max(1, exercise.sets ?? 1);
    return total + repsSeconds * sets + Math.max(0, exercise.restSeconds ?? 0);
  }, 0);
};

export const formatWorkoutDuration = (seconds?: number | null) => {
  const total = Math.max(0, Math.round(seconds ?? 0));
  if (!total) return '--';
  if (total < 60) return `${total} sec`;
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return remainingSeconds ? `${minutes} min ${remainingSeconds} sec` : `${minutes} min`;
};
