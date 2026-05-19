<template>
  <AppLayout>
    <section v-if="template" class="workout-detail">
      <div class="workout-detail__hero">
        <div class="page-header page-header--row">
          <button class="icon-btn icon-btn--light" type="button" @click="router.push('/workouts')">‹</button>
          <RouterLink class="secondary-btn" :to="`/workouts/${template.id}/edit`">Modifica</RouterLink>
        </div>
        <h1>{{ template.name }}</h1>
        <p v-if="template.description">{{ template.description }}</p>
        <div class="workout-summary-grid">
          <span><strong>{{ durationLabel }}</strong><small>Durata</small></span>
          <span><strong>{{ sequence.length }}</strong><small>Step</small></span>
          <span><strong>{{ template.blocks?.length ?? 0 }}</strong><small>Gruppi</small></span>
        </div>
      </div>

      <section class="workout-structure">
        <article v-for="step in topSteps" :key="`top-${step.sortOrder}`" class="workout-step-row" :class="`workout-step-row--${step.stepType.toLowerCase()}`">
          <strong>{{ step.name }}</strong>
          <span>{{ stepLabel(step) }}</span>
        </article>

        <article v-for="(block, index) in template.blocks ?? []" :key="block.id ?? index" class="workout-block-detail">
          <button type="button" class="workout-block-detail__header" @click="toggleBlock(index)">
            <span>
              <strong>{{ block.title }}</strong>
              <small>x{{ block.repeatCount }} laps</small>
            </span>
            <span>{{ collapsed[index] ? '+' : '-' }}</span>
          </button>
          <div v-if="!collapsed[index]" class="workout-block-detail__steps">
            <div v-for="step in block.steps" :key="`${block.id}-${step.sortOrder}`" class="workout-step-row" :class="`workout-step-row--${step.stepType.toLowerCase()}`">
              <strong>{{ step.name }}</strong>
              <span>{{ stepLabel(step) }}</span>
            </div>
          </div>
        </article>

        <p v-if="!sequence.length" class="empty-state">Scheda vuota. Aggiungi esercizi per poter iniziare.</p>
      </section>

      <div class="workout-bottom-actions">
        <button class="danger-btn" type="button" @click="remove">Elimina</button>
        <button class="primary-btn" type="button" :disabled="!sequence.length || starting" @click="start">
          START
        </button>
      </div>
      <p v-if="error" class="form-alert">{{ error }}</p>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { getWorkoutTemplate } from '@/api/workoutsApi';
import { flattenWorkoutTemplate } from '@/composables/useWorkoutRunner';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { WorkoutStepDto, WorkoutTemplateResponse } from '@/types/api';
import { getErrorMessage } from '@/utils/errorMessage';
import { estimateWorkoutTemplateSeconds, formatWorkoutDuration } from '@/utils/workoutDuration';

const route = useRoute();
const router = useRouter();
const workouts = useWorkoutStore();
const template = ref<WorkoutTemplateResponse | null>(null);
const collapsed = ref<Record<number, boolean>>({});
const starting = ref(false);
const error = ref('');

const sequence = computed(() => (template.value ? flattenWorkoutTemplate(template.value) : []));
const topSteps = computed(() => template.value?.steps?.length ? template.value.steps : (!template.value?.blocks?.length ? sequence.value : []));
const workoutSessionId = computed(() => {
  const raw = route.query.workoutSessionId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});
const eventDate = computed(() => {
  const raw = route.query.eventDate;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value || null;
});
const durationLabel = computed(() => {
  const seconds = template.value ? estimateWorkoutTemplateSeconds(template.value) : 0;
  return formatWorkoutDuration(seconds);
});

const stepLabel = (step: WorkoutStepDto) => {
  if (step.stepType === 'BREAK') return `${formatSeconds(step.durationSeconds ?? 0)} break`;
  if (step.measurementType === 'TIME') return formatSeconds(step.durationSeconds ?? 0);
  return `x${step.reps ?? 0} reps`;
};

const formatSeconds = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

const toggleBlock = (index: number) => {
  collapsed.value[index] = !collapsed.value[index];
};

const start = async () => {
  if (!template.value) return;
  try {
    starting.value = true;
    const run = await workouts.startRun(template.value.id, workoutSessionId.value);
    await router.push({ path: `/workout-runs/${run.id}`, query: eventDate.value ? { eventDate: eventDate.value } : undefined });
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    starting.value = false;
  }
};

const remove = async () => {
  if (!template.value || !window.confirm('Eliminare o archiviare questa scheda?')) return;
  await workouts.removeTemplate(template.value.id);
  await router.push('/workouts');
};

onMounted(async () => {
  template.value = await getWorkoutTemplate(Number(route.params.id));
});
</script>
