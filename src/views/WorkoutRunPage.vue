<template>
  <main class="workout-run-screen">
    <section v-if="run" class="workout-run">
      <header class="workout-run__top">
        <button class="icon-btn icon-btn--light" type="button" @click="cancel">x</button>
        <div>
          <strong>{{ formatSeconds(runner.elapsedTime.value) }}</strong>
          <small>tempo</small>
        </div>
        <button class="secondary-btn" type="button" @click="showList = !showList">Lista</button>
      </header>

      <section v-if="runner.currentStep.value" class="workout-run__main" :class="`workout-run__main--${runner.currentStep.value.stepType.toLowerCase()}`">
        <div v-if="runner.currentStep.value.blockTitle" class="workout-run__set-chip">
          <strong>Serie {{ runner.currentStep.value.lap }}/{{ runner.currentStep.value.totalLaps }}</strong>
          <span>Gruppo: {{ runner.currentStep.value.blockTitle }}</span>
        </div>
        <h1>{{ runner.currentStep.value.name }}</h1>
        <div class="progress-ring" :style="{ '--progress': `${runner.progress.value}%` }">
          <div>
            <strong v-if="runner.currentStep.value.measurementType === 'REPS'">x{{ runner.currentStep.value.reps }}</strong>
            <strong v-else>{{ formatSeconds(runner.remainingTime.value) }}</strong>
            <small>{{ runner.currentStep.value.stepType === 'BREAK' ? 'recupero' : 'work' }}</small>
          </div>
        </div>
        <p v-if="runner.nextStep.value" class="next-up">Prossimo: {{ runner.nextStep.value.name }}</p>
        <p class="next-up">{{ runner.completedSteps.value }} / {{ runner.sequence.value.length }} step - {{ remainingSteps }} mancanti</p>
      </section>

      <section v-if="runner.isFinished.value" class="workout-run-summary">
        <h2>Workout completato</h2>
        <p>{{ formatSeconds(runner.elapsedTime.value) }} totali</p>
        <button class="primary-btn" type="button" @click="router.push(`/workouts/${run.templateId}`)">Torna alla scheda</button>
      </section>

      <section v-if="showList" class="workout-run-list">
        <div
          v-for="(step, index) in runner.sequence.value"
          :key="`${step.originStepId}-${index}`"
          :class="{ 'workout-run-list__item--active': index === runner.currentIndex.value }"
          class="workout-run-list__item"
        >
          <span>{{ index + 1 }}</span>
          <strong>
            {{ step.name }}
            <small v-if="step.blockTitle">Serie {{ step.lap }}/{{ step.totalLaps }}</small>
          </strong>
          <small>{{ step.measurementType === 'REPS' ? `x${step.reps}` : formatSeconds(step.durationSeconds ?? 0) }}</small>
        </div>
      </section>

      <footer class="workout-run-controls">
        <button class="secondary-btn" type="button" @click="previous">Indietro</button>
        <button class="primary-btn" type="button" @click="togglePause">{{ runner.isPaused.value ? 'Riprendi' : 'Pausa' }}</button>
        <button v-if="runner.currentStep.value?.measurementType === 'REPS'" class="primary-btn" type="button" @click="completeStep">Completato</button>
        <button v-else class="secondary-btn" type="button" @click="skip">Skip</button>
        <button class="danger-btn" type="button" @click="complete">Fine</button>
      </footer>
    </section>
    <p v-else class="empty-state">Caricamento workout...</p>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useWorkoutRunner } from '@/composables/useWorkoutRunner';
import { usePlanningStore } from '@/stores/planningStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { getErrorMessage } from '@/utils/errorMessage';

const route = useRoute();
const router = useRouter();
const planning = usePlanningStore();
const workouts = useWorkoutStore();
const { activeRun } = storeToRefs(workouts);
const runner = useWorkoutRunner(activeRun);
const run = computed(() => activeRun.value);
const showList = ref(false);
const saveInterval = ref<number | undefined>();
const remainingSteps = computed(() => Math.max(0, runner.sequence.value.length - runner.currentIndex.value - 1));
const eventDate = computed(() => {
  const raw = route.query.eventDate;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value || null;
});

const persistState = async () => {
  if (!run.value || runner.isFinished.value) return;
  await workouts.updateRunState(run.value.id, runner.snapshot());
};

const togglePause = async () => {
  if (!run.value) return;
  if (runner.isPaused.value) {
    runner.resume();
    await workouts.resumeRun(run.value.id);
  } else {
    runner.pause();
    await workouts.pauseRun(run.value.id, runner.snapshot());
  }
};

const skip = async () => {
  runner.next();
  await persistState();
};

const previous = async () => {
  runner.previous();
  await persistState();
};

const completeStep = async () => {
  runner.completeStep();
  await persistState();
};

const complete = async () => {
  if (!run.value) return;
  runner.complete();
  await workouts.completeRun(run.value.id, runner.snapshot());
  if (eventDate.value) {
    await planning.loadDay(eventDate.value);
  }
};

const cancel = async () => {
  if (!run.value) {
    await router.push('/workouts');
    return;
  }
  if (window.confirm('Annullare il workout in corso?')) {
    await workouts.cancelRun(run.value.id);
    await router.push(`/workouts/${run.value.templateId}`);
  }
};

const formatSeconds = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

onMounted(async () => {
  try {
    await workouts.loadRun(Number(route.params.runId));
    saveInterval.value = window.setInterval(() => {
      persistState().catch(() => undefined);
    }, 15000);
  } catch (err) {
    window.alert(getErrorMessage(err));
    await router.push('/workouts');
  }
});

onUnmounted(() => {
  if (saveInterval.value !== undefined) {
    window.clearInterval(saveInterval.value);
  }
  persistState().catch(() => undefined);
});
</script>
