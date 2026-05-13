<template>
  <div class="modal-backdrop">
    <form class="modal" @submit.prevent="submit">
      <div class="panel__header">
        <h2>{{ event ? 'Dettaglio evento' : title }}</h2>
        <button class="icon-btn" type="button" @click="$emit('close')">x</button>
      </div>

      <input v-model.trim="draft.title" required placeholder="Titolo" />
      <textarea v-model.trim="draft.description" placeholder="Descrizione completa"></textarea>

      <div class="form-grid">
        <input v-model="draft.eventDate" type="date" required />
        <select v-model="draft.type">
          <option value="STUDY">Studio</option>
          <option value="EXAM">Esame</option>
          <option value="PERSONAL">Personale</option>
          <option value="GYM">Palestra</option>
          <option value="WORKOUT">Allenamento</option>
          <option value="OTHER">Altro</option>
        </select>
      </div>

      <select v-if="showWorkoutTemplate" v-model.number="draft.workoutTemplateId" required>
        <option :value="null" disabled>Scegli scheda allenamento</option>
        <option v-for="template in templates" :key="template.id" :value="template.id">
          {{ template.name }}
        </option>
      </select>

      <label class="check-row"><input v-model="draft.allDay" type="checkbox" /> Tutto il giorno</label>
      <div v-if="!draft.allDay" class="form-grid">
        <input v-model="draft.startTime" type="time" required />
        <input v-model="draft.endTime" type="time" required />
      </div>

      <input v-model.trim="draft.location" placeholder="Luogo" />

      <div class="form-grid">
        <select v-model="draft.recurrenceType">
          <option value="NONE">Nessuna ripetizione</option>
          <option value="DAILY">Ogni giorno</option>
          <option value="WEEKLY">Ogni settimana</option>
          <option value="BIWEEKLY">Ogni due settimane</option>
          <option value="MONTHLY">Ogni mese</option>
        </select>
        <input v-if="draft.recurrenceType !== 'NONE'" v-model="draft.recurrenceUntil" type="date" required />
      </div>

      <section class="sub-panel">
        <strong>Partecipanti</strong>
        <div class="participant-search">
          <input v-model.trim="userQuery" placeholder="Cerca utente registrato" @input="runUserSearch" />
          <button class="secondary-btn" type="button" @click="addFreeParticipant">Aggiungi libero</button>
        </div>
        <div v-if="userResults.length" class="search-results">
          <button v-for="user in userResults" :key="user.id" type="button" @click="addUserParticipant(user)">
            {{ user.username }} <small>{{ user.email }}</small>
          </button>
        </div>
        <input v-model.trim="freeParticipantName" placeholder="Nome libero opzionale" />
        <div v-if="draft.participants.length" class="chips chips--wrap">
          <button v-for="participant in draft.participants" :key="participantKey(participant)" class="context-chip" type="button" @click="removeParticipant(participant)">
            {{ participant.displayName }} x
          </button>
        </div>
      </section>

      <p v-if="linkedWorkoutLabel" class="empty-state">{{ linkedWorkoutLabel }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>

      <div class="modal-actions">
        <button v-if="event" class="danger-btn" type="button" @click="$emit('delete', event)">Elimina</button>
        <button class="primary-btn" type="submit">{{ event ? 'Salva modifiche' : 'Salva evento' }}</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { searchUsers } from '@/api/usersApi';
import type { CalendarEventRequest, CalendarEventResponse, ParticipantDto, UserResponse, WorkoutTemplateResponse } from '@/types/api';

const props = withDefaults(
  defineProps<{
    date: string;
    title?: string;
    event?: CalendarEventResponse | null;
    templates?: WorkoutTemplateResponse[];
    workoutMode?: boolean;
  }>(),
  { title: 'Nuovo evento', event: null, templates: () => [], workoutMode: false },
);

const emit = defineEmits<{
  close: [];
  save: [payload: CalendarEventRequest, id?: number];
  delete: [event: CalendarEventResponse];
}>();

const base = props.event;
const draft = reactive<CalendarEventRequest>({
  title: base?.title ?? '',
  description: base?.description ?? '',
  eventDate: base?.eventDate ?? props.date,
  startTime: base?.startTime?.slice(0, 5) ?? '09:00',
  endTime: base?.endTime?.slice(0, 5) ?? '10:00',
  allDay: base?.allDay ?? false,
  type: base?.type ?? (props.workoutMode ? 'WORKOUT' : 'PERSONAL'),
  location: base?.location ?? '',
  color: base?.color ?? '',
  workoutSessionId: base?.workoutSessionId ?? null,
  workoutTemplateId: base?.workoutTemplateId ?? null,
  recurrenceType: base?.recurrenceType ?? 'NONE',
  recurrenceUntil: base?.recurrenceUntil ?? null,
  participants: [...(base?.participants ?? [])],
});

const userQuery = ref('');
const userResults = ref<UserResponse[]>([]);
const freeParticipantName = ref('');
const error = ref('');
let searchTimer: number | undefined;

const showWorkoutTemplate = computed(() => props.workoutMode && !props.event);
const linkedWorkoutLabel = computed(() => (draft.workoutSessionId ? `Allenamento collegato: sessione #${draft.workoutSessionId}` : ''));

const runUserSearch = () => {
  window.clearTimeout(searchTimer);
  if (userQuery.value.length < 2) {
    userResults.value = [];
    return;
  }
  searchTimer = window.setTimeout(async () => {
    userResults.value = await searchUsers(userQuery.value);
  }, 250);
};

const participantKey = (participant: ParticipantDto) => `${participant.participantType}-${participant.userId ?? participant.displayName}`;

const addUserParticipant = (user: UserResponse) => {
  if (draft.participants.some((participant) => participant.userId === user.id)) return;
  draft.participants.push({ userId: user.id, displayName: user.username, participantType: 'REGISTERED_USER' });
  userQuery.value = '';
  userResults.value = [];
};

const addFreeParticipant = () => {
  if (!freeParticipantName.value) return;
  draft.participants.push({ displayName: freeParticipantName.value, participantType: 'FREE_TEXT' });
  freeParticipantName.value = '';
};

const removeParticipant = (participant: ParticipantDto) => {
  draft.participants = draft.participants.filter((item) => item !== participant);
};

const submit = () => {
  error.value = '';
  if (showWorkoutTemplate.value && !draft.workoutTemplateId) {
    error.value = 'Scegli quale allenamento usare.';
    return;
  }
  emit(
    'save',
    {
      ...draft,
      startTime: draft.allDay ? null : draft.startTime,
      endTime: draft.allDay ? null : draft.endTime,
      recurrenceUntil: draft.recurrenceType === 'NONE' ? null : draft.recurrenceUntil,
      workoutTemplateId: showWorkoutTemplate.value ? draft.workoutTemplateId : null,
    },
    props.event?.id,
  );
};
</script>
