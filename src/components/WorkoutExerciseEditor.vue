<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <form class="modal workout-exercise-modal" @submit.prevent="submit">
      <div class="workout-step-modal__top">
        <button class="icon-btn icon-btn--light" type="button" @click="$emit('close')">&lsaquo;</button>
        <strong>Esercizio</strong>
        <button class="icon-btn icon-btn--light" type="button" @click="$emit('close')">x</button>
      </div>

      <section class="workout-exercise-card">
        <label class="form-field workout-step-title-field">
          <span class="field-label">Titolo esercizio</span>
          <input v-model.trim="model.name" required placeholder="Push up" />
        </label>

        <div class="workout-step-toggle workout-step-toggle--measure">
          <button type="button" :class="{ active: model.measurementType === 'REPS' }" @click="model.measurementType = 'REPS'">Per ripetizioni</button>
          <button type="button" :class="{ active: model.measurementType === 'TIME' }" @click="model.measurementType = 'TIME'">Per tempo</button>
        </div>

        <div class="workout-exercise-focus">
          <strong v-if="model.measurementType === 'REPS'">x{{ model.reps || 0 }}</strong>
          <strong v-else>{{ timePreview }}</strong>
          <small>{{ model.measurementType === 'REPS' ? estimatedLabel : 'durata' }}</small>
        </div>

        <label v-if="model.measurementType === 'REPS'" class="form-field workout-main-input">
          <span class="field-label">Ripetizioni</span>
          <input v-model.number="model.reps" type="number" min="1" required />
        </label>

        <div v-else class="form-grid">
          <label class="form-field">
            <span class="field-label">Minuti</span>
            <input v-model.number="minutes" type="number" min="0" max="99" />
          </label>
          <label class="form-field">
            <span class="field-label">Secondi</span>
            <input v-model.number="seconds" type="number" min="0" max="59" />
          </label>
        </div>

        <label class="form-field">
          <span class="field-label">Descrizione</span>
          <textarea v-model.trim="model.description" placeholder="Note opzionali"></textarea>
        </label>

        <label class="form-field">
          <span class="field-label">Intensita</span>
          <input v-model.trim="model.intensity" placeholder="Leggera, media, alta..." />
        </label>
      </section>

      <p v-if="error" class="form-alert">{{ error }}</p>
      <button class="primary-btn workout-step-done" type="submit">Done</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { WorkoutStepDto } from '@/types/api';
import { formatWorkoutDuration } from '@/utils/workoutDuration';

const props = defineProps<{ step?: WorkoutStepDto | null; order: number }>();
const emit = defineEmits<{ save: [step: WorkoutStepDto]; close: [] }>();

const model = reactive<WorkoutStepDto>({
  name: '',
  description: '',
  stepType: 'ACTIVE',
  measurementType: 'REPS',
  reps: 10,
  durationSeconds: null,
  sortOrder: props.order,
  color: 'var(--workout-active)',
  intensity: '',
  active: true,
});
const minutes = ref(0);
const seconds = ref(30);
const error = ref('');
const timePreview = computed(() =>
  `${String(Number(minutes.value) || 0).padStart(2, '0')}:${String(Number(seconds.value) || 0).padStart(2, '0')}`,
);
const estimatedLabel = computed(() => formatWorkoutDuration(Math.max(0, model.reps ?? 0) * 5));

watch(() => props.step, (step) => {
  Object.assign(model, {
    name: step?.name ?? '',
    description: step?.description ?? '',
    stepType: 'ACTIVE',
    measurementType: step?.measurementType ?? 'REPS',
    reps: step?.reps ?? 10,
    durationSeconds: step?.durationSeconds ?? null,
    sortOrder: props.order,
    color: step?.color ?? 'var(--workout-active)',
    intensity: step?.intensity ?? '',
    active: step?.active ?? true,
  });
  const duration = step?.durationSeconds ?? 30;
  minutes.value = Math.floor(duration / 60);
  seconds.value = duration % 60;
}, { immediate: true });

const submit = () => {
  error.value = '';
  if (!model.name.trim()) {
    error.value = 'Il nome esercizio e obbligatorio.';
    return;
  }

  const duration = Math.max(0, (Number(minutes.value) || 0) * 60 + (Number(seconds.value) || 0));
  if (model.measurementType === 'TIME') {
    if (duration <= 0) {
      error.value = 'La durata deve essere maggiore di zero.';
      return;
    }
    model.durationSeconds = duration;
    model.reps = null;
  } else {
    if (!model.reps || model.reps <= 0) {
      error.value = 'Le ripetizioni devono essere maggiori di zero.';
      return;
    }
    model.durationSeconds = null;
  }

  emit('save', {
    ...model,
    name: model.name.trim(),
    stepType: 'ACTIVE',
    color: model.color || 'var(--workout-active)',
    sortOrder: props.order,
  });
};
</script>
