import { computed, onUnmounted, ref, watch } from 'vue';
import type { WorkoutBlockDto, WorkoutRunResponse, WorkoutStepDto, WorkoutTemplateResponse } from '@/types/api';

export interface ExecutableWorkoutStep extends WorkoutStepDto {
  blockTitle?: string | null;
  blockIndex: number;
  lap: number;
  totalLaps: number;
  originStepId?: number | null;
}

const tickMs = 1000;

export const flattenWorkoutTemplate = (template: WorkoutTemplateResponse): ExecutableWorkoutStep[] => {
  const sequence: ExecutableWorkoutStep[] = [];
  const topSteps = template.steps?.length ? template.steps : legacyExercisesToSteps(template);
  const items = [
    ...topSteps.map((step) => ({ type: 'step' as const, sortOrder: step.sortOrder, step })),
    ...(template.blocks ?? []).map((block, blockIndex) => ({ type: 'block' as const, sortOrder: block.sortOrder, block, blockIndex })),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  items.forEach((item) => {
    if (item.type === 'step') {
      sequence.push(toExecutable(item.step, -1, 1, 1, null));
      return;
    }
    const repeat = Math.min(99, Math.max(1, item.block.repeatCount || 1));
    for (let lap = 1; lap <= repeat; lap += 1) {
      item.block.steps
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .forEach((step) => sequence.push(toExecutable(step, item.blockIndex, lap, repeat, item.block)));
    }
  });
  return sequence.map((step, index) => ({ ...step, sortOrder: index }));
};

export const useWorkoutRunner = (run: { value: WorkoutRunResponse | null }) => {
  const sequence = computed(() => (run.value ? flattenWorkoutTemplate(run.value.template) : []));
  const currentIndex = ref(0);
  const elapsedTime = ref(0);
  const remainingTime = ref(0);
  const isPaused = ref(false);
  const isFinished = ref(false);
  let intervalId: number | undefined;

  const currentStep = computed(() => sequence.value[currentIndex.value] ?? null);
  const nextStep = computed(() => sequence.value[currentIndex.value + 1] ?? null);
  const progress = computed(() => {
    const step = currentStep.value;
    if (!step || step.measurementType === 'REPS') return 0;
    const total = step.durationSeconds || 1;
    return Math.min(100, Math.max(0, ((total - remainingTime.value) / total) * 100));
  });
  const completedSteps = computed(() => Math.min(currentIndex.value, sequence.value.length));

  const hydrate = () => {
    if (!run.value) return;
    currentIndex.value = Math.min(run.value.currentStepIndex || 0, Math.max(0, sequence.value.length - 1));
    elapsedTime.value = run.value.elapsedSeconds || 0;
    isPaused.value = run.value.status === 'PAUSED';
    isFinished.value = run.value.status === 'COMPLETED' || run.value.status === 'CANCELLED';
    const snapshot = readSnapshot(run.value.snapshotJson);
    remainingTime.value = snapshot?.remainingTime ?? currentStep.value?.durationSeconds ?? 0;
  };

  const startInterval = () => {
    cleanup();
    intervalId = window.setInterval(() => {
      if (isPaused.value || isFinished.value || !currentStep.value) return;
      elapsedTime.value += 1;
      if (currentStep.value.measurementType === 'REPS') return;
      remainingTime.value = Math.max(0, remainingTime.value - 1);
      if (remainingTime.value <= 0) {
        next();
      }
    }, tickMs);
  };

  const pause = () => {
    isPaused.value = true;
  };

  const resume = () => {
    isPaused.value = false;
  };

  const next = () => {
    if (currentIndex.value >= sequence.value.length - 1) {
      complete();
      return;
    }
    currentIndex.value += 1;
    remainingTime.value = currentStep.value?.durationSeconds ?? 0;
  };

  const previous = () => {
    currentIndex.value = Math.max(0, currentIndex.value - 1);
    remainingTime.value = currentStep.value?.durationSeconds ?? 0;
  };

  const completeStep = () => {
    next();
  };

  const complete = () => {
    isFinished.value = true;
    cleanup();
  };

  const snapshot = () => ({
    elapsedSeconds: elapsedTime.value,
    currentStepIndex: currentIndex.value,
    currentBlockIndex: currentStep.value?.blockIndex ?? 0,
    currentLap: currentStep.value?.lap ?? 1,
    snapshotJson: JSON.stringify({ remainingTime: remainingTime.value, sequenceLength: sequence.value.length }),
  });

  const cleanup = () => {
    if (intervalId !== undefined) {
      window.clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  watch([() => run.value?.id, sequence], () => {
    hydrate();
    if (!isFinished.value) startInterval();
  }, { immediate: true });

  onUnmounted(cleanup);

  return {
    sequence,
    currentIndex,
    currentStep,
    nextStep,
    elapsedTime,
    remainingTime,
    isPaused,
    isFinished,
    progress,
    completedSteps,
    pause,
    resume,
    next,
    previous,
    completeStep,
    complete,
    snapshot,
    cleanup,
  };
};

const toExecutable = (
  step: WorkoutStepDto,
  blockIndex: number,
  lap: number,
  totalLaps: number,
  block: WorkoutBlockDto | null,
): ExecutableWorkoutStep => ({
  ...step,
  blockTitle: block?.title ?? null,
  blockIndex,
  lap,
  totalLaps,
  originStepId: step.id,
});

const legacyExercisesToSteps = (template: WorkoutTemplateResponse): WorkoutStepDto[] =>
  template.exercises.map((exercise, index) => ({
    id: exercise.id,
    name: exercise.name,
    description: exercise.notes,
    stepType: 'ACTIVE',
    measurementType: 'REPS',
    reps: Number.parseInt(exercise.reps ?? '', 10) || 1,
    durationSeconds: null,
    sortOrder: index,
    color: null,
    intensity: exercise.muscleGroup,
    active: true,
  }));

const readSnapshot = (raw?: string | null): { remainingTime?: number } | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { remainingTime?: number };
  } catch {
    return null;
  }
};
