<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <form class="modal quick-break-modal" @submit.prevent="submit">
      <div class="modal-header">
        <div>
          <h2>Recupero</h2>
          <p>Imposta solo durata e note.</p>
        </div>
        <button class="icon-btn icon-btn--light" type="button" @click="$emit('close')">x</button>
      </div>

      <label class="form-field">
        <span class="field-label">Titolo</span>
        <input v-model.trim="name" required placeholder="Recupero" />
      </label>

      <div class="quick-break-presets">
        <button v-for="preset in presets" :key="preset.seconds" type="button" @click="setSeconds(preset.seconds)">
          {{ preset.label }}
        </button>
      </div>

      <div class="form-grid">
        <label class="form-field">
          <span class="field-label">Minuti</span>
          <input v-model.number="minutes" type="number" min="0" max="30" />
        </label>
        <label class="form-field">
          <span class="field-label">Secondi</span>
          <input v-model.number="seconds" type="number" min="0" max="59" />
        </label>
      </div>

      <label class="form-field">
        <span class="field-label">Descrizione</span>
        <textarea v-model.trim="description" placeholder="Note opzionali"></textarea>
      </label>

      <label class="form-field">
        <span class="field-label">Intensita</span>
        <input v-model.trim="intensity" placeholder="Opzionale" />
      </label>

      <p v-if="error" class="form-alert">{{ error }}</p>
      <div class="modal-actions">
        <button class="secondary-btn" type="button" @click="$emit('close')">Annulla</button>
        <button class="primary-btn" type="submit">Salva recupero</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { WorkoutStepDto } from '@/types/api';

const props = defineProps<{ step?: WorkoutStepDto | null; order: number }>();
const emit = defineEmits<{ save: [step: WorkoutStepDto]; close: [] }>();

const presets = [
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1m', seconds: 60 },
  { label: '1m30', seconds: 90 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
];

const name = ref('Recupero');
const description = ref('');
const intensity = ref('');
const minutes = ref(0);
const seconds = ref(45);
const error = ref('');

watch(() => props.step, (step) => {
  name.value = step?.name || 'Recupero';
  description.value = step?.description ?? '';
  intensity.value = step?.intensity ?? '';
  const duration = step?.durationSeconds ?? 45;
  minutes.value = Math.floor(duration / 60);
  seconds.value = duration % 60;
}, { immediate: true });

const setSeconds = (total: number) => {
  minutes.value = Math.floor(total / 60);
  seconds.value = total % 60;
  error.value = '';
};

const submit = () => {
  error.value = '';
  const totalSeconds = (Number(minutes.value) || 0) * 60 + (Number(seconds.value) || 0);
  if (!name.value.trim()) {
    error.value = 'Il titolo recupero e obbligatorio.';
    return;
  }
  if (totalSeconds <= 0) {
    error.value = 'La durata deve essere maggiore di zero.';
    return;
  }
  if (totalSeconds > 1800) {
    error.value = 'La durata massima consentita e 30 minuti.';
    return;
  }

  emit('save', {
    id: props.step?.id,
    blockId: props.step?.blockId,
    name: name.value.trim(),
    description: description.value,
    stepType: 'BREAK',
    measurementType: 'TIME',
    durationSeconds: totalSeconds,
    reps: null,
    sortOrder: props.order,
    color: props.step?.color ?? 'var(--workout-break)',
    intensity: intensity.value,
    active: props.step?.active ?? true,
  });
};
</script>
