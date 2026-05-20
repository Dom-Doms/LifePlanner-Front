<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <form class="modal workout-step-modal" :class="`workout-step-modal--${model.stepType.toLowerCase()}`" @submit.prevent="submit">
      <div class="workout-step-modal__top">
        <button class="icon-btn icon-btn--light" type="button" @click="$emit('close')">&lsaquo;</button>
        <strong>{{ model.stepType === 'BREAK' ? 'Recupero' : 'Esercizio' }}</strong>
        <button class="icon-btn icon-btn--light" type="button" @click="$emit('close')">x</button>
      </div>

      <section class="workout-step-card">
        <div class="workout-step-toggle">
          <button type="button" :class="{ active: model.stepType === 'ACTIVE' }" @click="setStepType('ACTIVE')">Esercizio</button>
          <button type="button" :class="{ active: model.stepType === 'BREAK' }" @click="setStepType('BREAK')">Recupero</button>
        </div>

        <label class="form-field workout-step-title-field">
          <span class="field-label">Titolo</span>
          <input v-model.trim="model.name" required :placeholder="model.stepType === 'BREAK' ? 'Recupero' : 'Push up'" />
        </label>

        <div v-if="model.stepType === 'ACTIVE'" class="workout-step-toggle workout-step-toggle--measure">
          <button type="button" :class="{ active: model.measurementType === 'TIME' }" @click="model.measurementType = 'TIME'">Per tempo</button>
          <button type="button" :class="{ active: model.measurementType === 'REPS' }" @click="model.measurementType = 'REPS'">Per reps</button>
        </div>

        <div class="workout-step-preview" :class="{ 'workout-step-preview--break': model.stepType === 'BREAK' }">
          <strong v-if="model.measurementType === 'REPS' && model.stepType === 'ACTIVE'">x{{ model.reps || 0 }}</strong>
          <strong v-else>{{ timePreview }}</strong>
          <small>{{ model.stepType === 'BREAK' ? 'recupero' : model.measurementType === 'TIME' ? 'for time' : 'for reps' }}</small>
        </div>

        <div v-if="model.measurementType === 'TIME' || model.stepType === 'BREAK'" class="form-grid">
          <label class="form-field">
            <span class="field-label">Minuti</span>
            <input v-model.number="minutes" type="number" min="0" max="99" />
          </label>
          <label class="form-field">
            <span class="field-label">Secondi</span>
            <input v-model.number="seconds" type="number" min="0" max="59" />
          </label>
        </div>

        <label v-else class="form-field">
          <span class="field-label">Ripetizioni</span>
          <input v-model.number="model.reps" type="number" min="1" required />
        </label>

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
import type { WorkoutStepDto, WorkoutStepType } from '@/types/api';

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
  color: '',
  intensity: '',
  active: true,
});
const minutes = ref(0);
const seconds = ref(30);
const error = ref('');
const timePreview = computed(() =>
  `${String(Number(minutes.value) || 0).padStart(2, '0')}:${String(Number(seconds.value) || 0).padStart(2, '0')}`,
);

watch(() => props.step, (step) => {
  Object.assign(model, step ?? {
    name: '',
    description: '',
    stepType: 'ACTIVE',
    measurementType: 'REPS',
    reps: 10,
    durationSeconds: null,
    sortOrder: props.order,
    color: '',
    intensity: '',
    active: true,
  });
  const duration = step?.durationSeconds ?? 30;
  minutes.value = Math.floor(duration / 60);
  seconds.value = duration % 60;
}, { immediate: true });

const syncType = () => {
  if (model.stepType === 'BREAK') {
    model.name = model.name || 'Recupero';
    model.measurementType = 'TIME';
    model.color = 'var(--workout-break)';
  } else {
    model.color = model.color === 'var(--workout-break)' ? 'var(--workout-active)' : model.color || 'var(--workout-active)';
    if (!model.reps) {
      model.reps = 10;
    }
  }
};

const setStepType = (type: WorkoutStepType) => {
  model.stepType = type;
  syncType();
};

const submit = () => {
  error.value = '';
  const duration = Math.max(0, (Number(minutes.value) || 0) * 60 + (Number(seconds.value) || 0));
  if (model.stepType === 'BREAK' || model.measurementType === 'TIME') {
    if (duration <= 0) {
      error.value = 'La durata deve essere maggiore di zero.';
      return;
    }
    model.durationSeconds = duration;
    model.reps = null;
  } else if (!model.reps || model.reps <= 0) {
    error.value = 'Le ripetizioni devono essere maggiori di zero.';
    return;
  }
  if (model.stepType === 'ACTIVE' && !model.name.trim()) {
    error.value = 'Il nome esercizio e obbligatorio.';
    return;
  }
  emit('save', { ...model, name: model.name.trim(), sortOrder: props.order });
};
</script>
