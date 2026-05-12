<template>
  <div class="modal-backdrop">
    <form class="modal" @submit.prevent="submit">
      <div class="panel__header">
        <h2>Nuovo evento</h2>
        <button class="icon-btn" type="button" @click="$emit('close')">x</button>
      </div>
      <input v-model.trim="draft.title" required placeholder="Titolo" />
      <textarea v-model.trim="draft.description" placeholder="Descrizione"></textarea>
      <div class="form-grid">
        <input v-model="draft.eventDate" type="date" required />
        <select v-model="draft.type">
          <option value="STUDY">Studio</option>
          <option value="EXAM">Esame</option>
          <option value="PERSONAL">Personale</option>
          <option value="GYM">Palestra</option>
          <option value="OTHER">Altro</option>
        </select>
      </div>
      <label class="check-row"><input v-model="draft.allDay" type="checkbox" /> Tutto il giorno</label>
      <div v-if="!draft.allDay" class="form-grid">
        <input v-model="draft.startTime" type="time" />
        <input v-model="draft.endTime" type="time" />
      </div>
      <input v-model.trim="draft.location" placeholder="Luogo" />
      <input v-model.trim="participantName" placeholder="Partecipante libero" />
      <button class="primary-btn" type="submit">Salva evento</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { CalendarEventRequest } from '@/types/api';

const props = defineProps<{ date: string }>();
const emit = defineEmits<{ close: []; save: [payload: CalendarEventRequest] }>();

const participantName = ref('');
const draft = reactive<CalendarEventRequest>({
  title: '',
  description: '',
  eventDate: props.date,
  startTime: '09:00',
  endTime: '10:00',
  allDay: false,
  type: 'PERSONAL',
  location: '',
  color: '',
  workoutSessionId: null,
  participants: [],
});

const submit = () => {
  emit('save', {
    ...draft,
    startTime: draft.allDay ? null : draft.startTime,
    endTime: draft.allDay ? null : draft.endTime,
    participants: participantName.value
      ? [{ displayName: participantName.value, participantType: 'FREE_TEXT' }]
      : [],
  });
};
</script>
