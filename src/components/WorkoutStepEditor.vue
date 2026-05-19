<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <form class="modal workout-step-modal" @submit.prevent="submit">
      <div class="modal-header">
        <div>
          <h2>{{ model.stepType === 'BREAK' ? 'Recupero' : 'Esercizio' }}</h2>
          <p>Configura tipo, durata o ripetizioni.</p>
        </div>
        <button class="icon-btn icon-btn--light" type="button" @click="$emit('close')">x</button>
      </div>

      <label class="form-field">
        <span class="field-label">Tipo</span>
        <select v-model="model.stepType" @change="syncType">
          <option value="ACTIVE">Esercizio</option>
          <option value="BREAK">Recupero</option>
        </select>
      </label>

      <label class="form-field">
        <span class="field-label">Nome</span>
        <input v-model.trim="model.name" :required="model.stepType === 'ACTIVE'" :placeholder="model.stepType === 'BREAK' ? 'Break' : 'Push up'" />
      </label>

      <label class="form-field">
        <span class="field-label">Descrizione</span>
        <textarea v-model.trim="model.description" placeholder="Note opzionali"></textarea>
      </label>

      <label v-if="model.stepType === 'ACTIVE'" class="form-field">
        <span class="field-label">Modalita</span>
        <select v-model="model.measurementType">
          <option value="REPS">Ripetizioni</option>
          <option value="TIME">Tempo</option>
        </select>
      </label>

      <div v-if="model.measurementType === 'TIME' || model.stepType === 'BREAK'" class="form-grid">
        <label class="form-field">
          <span class="field-label">Minuti</span>
          <input v-model.number="minutes" type="number" min="0" />
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
        <span class="field-label">Intensita / colore</span>
        <select v-model="model.color">
          <option value="">Neutro</option>
          <option value="var(--workout-active)">Attivo</option>
          <option value="var(--workout-break)">Recupero</option>
          <option value="var(--app-accent)">Focus</option>
        </select>
      </label>

      <p v-if="error" class="form-alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="secondary-btn" type="button" @click="$emit('close')">Annulla</button>
        <button class="primary-btn" type="submit">Salva</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { WorkoutStepDto } from '@/types/api';

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
    model.name = model.name || 'Break';
    model.measurementType = 'TIME';
    model.color = model.color || 'var(--workout-break)';
  }
};

const submit = () => {
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
