<template>
  <div class="modal-backdrop">
    <form ref="modalForm" class="modal event-modal" novalidate @submit.prevent="submit">
      <div class="panel__header event-modal__header">
        <h2>{{ event ? 'Dettaglio evento' : title }}</h2>
        <button class="icon-btn" type="button" @click="$emit('close')">x</button>
      </div>

      <div ref="modalBody" class="event-modal__body">
        <p v-if="generalError" class="form-alert" role="alert">{{ generalError }}</p>

        <label class="form-field" :class="{ 'form-field--invalid': Boolean(fieldErrors.title) }" data-error-key="title">
          <input v-model.trim="draft.title" placeholder="Titolo" :aria-invalid="Boolean(fieldErrors.title)" />
          <span v-if="fieldErrors.title" class="field-error">{{ fieldErrors.title }}</span>
        </label>

        <label class="form-field">
          <textarea v-model.trim="draft.description" placeholder="Descrizione completa"></textarea>
        </label>

        <div class="form-grid">
          <label class="form-field" :class="{ 'form-field--invalid': Boolean(fieldErrors.eventDate) }" data-error-key="eventDate">
            <input v-model="draft.eventDate" type="date" :aria-invalid="Boolean(fieldErrors.eventDate)" />
            <span v-if="fieldErrors.eventDate" class="field-error">{{ fieldErrors.eventDate }}</span>
          </label>
          <label class="form-field">
            <select v-model="draft.type">
              <option value="STUDY">Studio</option>
              <option value="EXAM">Esame</option>
              <option value="PERSONAL">Personale</option>
              <option value="GYM">Palestra</option>
              <option value="WORKOUT">Allenamento</option>
              <option value="OTHER">Altro</option>
            </select>
          </label>
        </div>

        <label
          v-if="showWorkoutTemplate"
          class="form-field"
          :class="{ 'form-field--invalid': Boolean(fieldErrors.workoutTemplateId) }"
          data-error-key="workoutTemplateId"
        >
          <select v-model.number="draft.workoutTemplateId" :aria-invalid="Boolean(fieldErrors.workoutTemplateId)">
            <option :value="null" disabled>Scegli scheda allenamento</option>
            <option v-for="template in templates" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
          <span v-if="fieldErrors.workoutTemplateId" class="field-error">{{ fieldErrors.workoutTemplateId }}</span>
        </label>

        <label class="check-row"><input v-model="draft.allDay" type="checkbox" /> Tutto il giorno</label>
        <div v-if="!draft.allDay" class="form-field" :class="{ 'form-field--invalid': Boolean(fieldErrors.times) }" data-error-key="times">
          <div class="form-grid">
            <input v-model="draft.startTime" type="time" :aria-invalid="Boolean(fieldErrors.times)" />
            <input v-model="draft.endTime" type="time" :aria-invalid="Boolean(fieldErrors.times)" />
          </div>
          <span v-if="fieldErrors.times" class="field-error">{{ fieldErrors.times }}</span>
        </div>

        <label class="form-field">
          <input v-model.trim="draft.location" placeholder="Luogo" />
        </label>

        <div class="form-grid">
          <label class="form-field">
            <select v-model="draft.recurrenceType">
              <option value="NONE">Nessuna ripetizione</option>
              <option value="DAILY">Ogni giorno</option>
              <option value="WEEKLY">Ogni settimana</option>
              <option value="BIWEEKLY">Ogni due settimane</option>
              <option value="MONTHLY">Ogni mese</option>
            </select>
          </label>
          <label
            v-if="draft.recurrenceType !== 'NONE'"
            class="form-field"
            :class="{ 'form-field--invalid': Boolean(fieldErrors.recurrenceUntil) }"
            data-error-key="recurrenceUntil"
          >
            <input v-model="draft.recurrenceUntil" type="date" :aria-invalid="Boolean(fieldErrors.recurrenceUntil)" />
            <span v-if="fieldErrors.recurrenceUntil" class="field-error">{{ fieldErrors.recurrenceUntil }}</span>
          </label>
        </div>

        <label class="form-field" :class="{ 'form-field--invalid': Boolean(fieldErrors.reminder) }" data-error-key="reminder">
          <span class="field-label">Promemoria</span>
          <select v-model.number="reminderOption" :aria-invalid="Boolean(fieldErrors.reminder)">
            <option :value="0">Nessuno</option>
            <option :value="10">10 minuti prima</option>
            <option :value="30">30 minuti prima</option>
            <option :value="60">1 ora prima</option>
            <option :value="1440">1 giorno prima</option>
          </select>
          <span v-if="fieldErrors.reminder" class="field-error">{{ fieldErrors.reminder }}</span>
        </label>

        <section class="sub-panel">
          <strong>Partecipanti</strong>
          <div class="participant-search">
            <input v-model.trim="userQuery" placeholder="Cerca utente registrato" @input="runUserSearch" />
            <button class="secondary-btn" type="button" @click="addFreeParticipant">Aggiungi libero</button>
          </div>
          <p v-if="searchError" class="error-text">{{ searchError }}</p>
          <p v-else-if="showNoResults" class="empty-state">Nessun utente trovato.</p>
          <div v-if="userResults.length" class="search-results">
            <button v-for="user in userResults" :key="user.id" type="button" @click="addUserParticipant(user)">
              {{ user.displayName ?? user.username }} <small>{{ user.email }}</small>
            </button>
          </div>
          <input v-model.trim="freeParticipantName" placeholder="Nome libero opzionale" />
          <div v-if="draft.participants.length" class="chips chips--wrap">
            <button v-for="participant in draft.participants" :key="participantKey(participant)" class="context-chip" type="button" @click="removeParticipant(participant)">
              {{ participant.displayName }} x
            </button>
          </div>
        </section>

        <section v-if="isSavedWorkoutEvent" class="sub-panel">
          <strong>Allenamento collegato</strong>
          <p class="empty-state">{{ linkedWorkoutLabel }}</p>
          <RouterLink
            v-if="draft.workoutTemplateId"
            class="secondary-btn secondary-btn--full"
            :to="`/workouts/${draft.workoutTemplateId}`"
          >
            Apri scheda allenamento
          </RouterLink>
        </section>
      </div>

      <div class="modal-actions event-modal__footer">
        <button v-if="event" class="danger-btn" type="button" @click="$emit('delete', event)">Elimina</button>
        <button class="primary-btn" type="submit">{{ event ? 'Salva modifiche' : 'Salva evento' }}</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { searchUsers } from '@/api/usersApi';
import type { CalendarEventRequest, CalendarEventResponse, ParticipantDto, UserResponse, WorkoutTemplateResponse } from '@/types/api';

type FieldErrorKey = 'title' | 'eventDate' | 'workoutTemplateId' | 'times' | 'recurrenceUntil' | 'reminder';
type FieldErrors = Partial<Record<FieldErrorKey, string>>;

const props = withDefaults(
  defineProps<{
    date: string;
    title?: string;
    event?: CalendarEventResponse | null;
    templates?: WorkoutTemplateResponse[];
    workoutMode?: boolean;
    serverError?: string;
    serverFieldErrors?: Record<string, string | string[]>;
  }>(),
  { title: 'Nuovo evento', event: null, templates: () => [], workoutMode: false, serverError: '', serverFieldErrors: () => ({}) },
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
  reminderEnabled: base?.reminderEnabled ?? false,
  reminderMinutesBefore: base?.reminderMinutesBefore ?? null,
  participants: [...(base?.participants ?? [])],
});

const userQuery = ref('');
const userResults = ref<UserResponse[]>([]);
const freeParticipantName = ref('');
const reminderOption = ref(base?.reminderEnabled ? base.reminderMinutesBefore ?? 30 : 0);
const searchError = ref('');
const searchDone = ref(false);
const generalError = ref('');
const fieldErrors = reactive<FieldErrors>({});
const modalForm = ref<HTMLFormElement | null>(null);
const modalBody = ref<HTMLElement | null>(null);
let searchTimer: number | undefined;

const isWorkoutEvent = computed(() => draft.type === 'WORKOUT');
const isSavedWorkoutEvent = computed(() => Boolean(props.event) && isWorkoutEvent.value);
const showWorkoutTemplate = computed(() => props.workoutMode && !props.event);
const linkedWorkoutLabel = computed(() => {
  if (!isWorkoutEvent.value) return '';
  const template = props.templates.find((item) => item.id === draft.workoutTemplateId);
  if (template) return template.name;
  if (draft.workoutSessionId) return `Sessione allenamento #${draft.workoutSessionId}`;
  return 'Scheda allenamento non disponibile';
});
const showNoResults = computed(() => userQuery.value.length >= 2 && searchDone.value && !userResults.value.length && !searchError.value);
const reminderValues = new Set([0, 10, 30, 60, 1440]);

const clearFieldErrors = () => {
  Object.keys(fieldErrors).forEach((key) => {
    delete fieldErrors[key as FieldErrorKey];
  });
};

const setFieldError = (key: FieldErrorKey, message: string) => {
  fieldErrors[key] = message;
};

const mapServerField = (field: string): FieldErrorKey | null => {
  if (field === 'title') return 'title';
  if (field === 'eventDate') return 'eventDate';
  if (field === 'workoutTemplateId' || field === 'templateId') return 'workoutTemplateId';
  if (['startTime', 'endTime', 'time'].includes(field)) return 'times';
  if (field === 'recurrenceUntil') return 'recurrenceUntil';
  if (field === 'reminderMinutesBefore' || field === 'reminderEnabled' || field === 'reminder') return 'reminder';
  return null;
};

const normalizeServerMessage = (value: string | string[]) => (Array.isArray(value) ? value[0] ?? 'Campo non valido.' : value);

const applyServerErrors = () => {
  if (!props.serverError && !Object.keys(props.serverFieldErrors).length) return;
  clearFieldErrors();
  generalError.value = props.serverError || 'Controlla i campi evidenziati.';
  Object.entries(props.serverFieldErrors).forEach(([field, message]) => {
    const key = mapServerField(field);
    if (key) setFieldError(key, normalizeServerMessage(message));
  });
  void nextTick(() => scrollToFirstError());
};

watch(() => [props.serverError, props.serverFieldErrors], applyServerErrors, { deep: true });

const scrollToFirstError = () => {
  const firstKey = Object.keys(fieldErrors)[0] as FieldErrorKey | undefined;
  if (!firstKey) {
    modalBody.value?.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const target = modalForm.value?.querySelector<HTMLElement>(`[data-error-key="${firstKey}"]`);
  const focusTarget = target?.querySelector<HTMLElement>('input, select, textarea, button');
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  focusTarget?.focus({ preventScroll: true });
};

const validate = () => {
  clearFieldErrors();

  if (!draft.title.trim()) setFieldError('title', 'Inserisci un titolo.');
  if (!draft.eventDate) setFieldError('eventDate', 'Inserisci una data.');
  if (showWorkoutTemplate.value && !draft.workoutTemplateId) setFieldError('workoutTemplateId', 'Scegli quale allenamento usare.');
  if (!draft.allDay) {
    if (!draft.startTime || !draft.endTime) {
      setFieldError('times', 'Inserisci ora di inizio e ora di fine.');
    } else if (draft.endTime <= draft.startTime) {
      setFieldError('times', "L'orario di fine deve essere successivo all'orario di inizio.");
    }
  }
  if (draft.recurrenceType !== 'NONE' && !draft.recurrenceUntil) setFieldError('recurrenceUntil', 'Inserisci la data di fine ripetizione.');
  if (!reminderValues.has(reminderOption.value ?? 0)) setFieldError('reminder', 'Seleziona un promemoria valido.');

  generalError.value = Object.keys(fieldErrors).length ? 'Controlla i campi evidenziati.' : '';
  return !Object.keys(fieldErrors).length;
};

const runUserSearch = () => {
  window.clearTimeout(searchTimer);
  searchError.value = '';
  searchDone.value = false;
  if (userQuery.value.length < 2) {
    userResults.value = [];
    return;
  }
  searchTimer = window.setTimeout(async () => {
    try {
      userResults.value = await searchUsers(userQuery.value);
    } catch {
      userResults.value = [];
      searchError.value = 'Ricerca utenti non disponibile.';
    } finally {
      searchDone.value = true;
    }
  }, 300);
};

const participantKey = (participant: ParticipantDto) => `${participant.participantType}-${participant.registeredUserId ?? participant.displayName}`;

const addUserParticipant = (user: UserResponse) => {
  if (draft.participants.some((participant) => participant.registeredUserId === user.id)) return;
  draft.participants.push({ registeredUserId: user.id, displayName: user.displayName ?? user.username, participantType: 'REGISTERED_USER' });
  userQuery.value = '';
  userResults.value = [];
  searchDone.value = false;
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
  if (!validate()) {
    void nextTick(() => scrollToFirstError());
    return;
  }
  emit(
    'save',
    {
      ...draft,
      startTime: draft.allDay ? null : draft.startTime,
      endTime: draft.allDay ? null : draft.endTime,
      recurrenceUntil: draft.recurrenceType === 'NONE' ? null : draft.recurrenceUntil,
      reminderEnabled: reminderOption.value > 0,
      reminderMinutesBefore: reminderOption.value > 0 ? reminderOption.value : null,
      workoutTemplateId: isWorkoutEvent.value ? draft.workoutTemplateId : null,
    },
    props.event?.id,
  );
};
</script>
