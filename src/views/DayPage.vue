<template>
  <AppLayout>
    <section class="page-header">
      <div>
        <h1>La tua giornata</h1>
        <p>{{ formatDate(date) }}</p>
      </div>
      <RouterLink to="/profile" class="icon-btn">P</RouterLink>
    </section>

    <ContextSelector
      :contexts="planning.contexts"
      :selected-id="plan?.context?.id ?? null"
      @change="changeContext"
      @create="createContext"
    />

    <section class="quick-actions">
      <button class="primary-btn" type="button" @click="openEventModal">+ Evento</button>
      <button class="secondary-btn" type="button" @click="openWorkoutModal">+ Allenamento</button>
    </section>

    <p v-if="feedback" class="success-text">{{ feedback }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <DayTimeline :date="date" :events="planning.events" @select="openSelectedEventModal" />

    <section v-if="visibleDayWorkoutCards.length" class="panel">
      <div class="panel__header">
        <h2>Dettaglio allenamento</h2>
        <RouterLink to="/workouts">Apri</RouterLink>
      </div>
      <button
        v-for="card in visibleDayWorkoutCards"
        :key="card.session.id"
        class="workout-card-link workout-card-button"
        type="button"
        @click="openWorkoutSessionDetail(card)"
      >
        <WorkoutCard
          :title="card.template?.name ?? card.session.title"
          :description="workoutCardDescription(card)"
          :count="workoutCardStepCount(card)"
          :duration-seconds="card.template ? estimateWorkoutTemplateSeconds(card.template) : null"
        >
          <template #meta>
            <span v-if="card.event.completed" class="workout-completed-badge">✓ Completato</span>
          </template>
        </WorkoutCard>
      </button>
    </section>
    <EventFormModal
      v-if="eventOpen"
      :date="date"
      :server-error="eventFormError"
      :server-field-errors="eventFormFieldErrors"
      @close="closeEventModal"
      @save="saveEvent"
    />
    <EventFormModal
      v-if="workoutOpen"
      title="Aggiungi allenamento"
      :date="date"
      :templates="workouts.templates"
      :server-error="eventFormError"
      :server-field-errors="eventFormFieldErrors"
      workout-mode
      @close="closeWorkoutModal"
      @save="saveWorkoutEvent"
    />
    <EventFormModal
      v-if="selectedEvent"
      :date="date"
      :event="selectedEvent"
      :templates="workouts.templates"
      :server-error="eventFormError"
      :server-field-errors="eventFormFieldErrors"
      @close="closeSelectedEventModal"
      @save="saveEvent"
      @delete="deleteEvent"
      @link-workout="linkParticipantWorkout"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import ContextSelector from '@/components/ContextSelector.vue';
import DayTimeline from '@/components/DayTimeline.vue';
import EventFormModal from '@/components/EventFormModal.vue';
import WorkoutCard from '@/components/WorkoutCard.vue';
import { usePlanningStore } from '@/stores/planningStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { CalendarEventRequest, CalendarEventResponse, DayContextRequest, RecurrenceType, WorkoutSessionResponse, WorkoutTemplateResponse } from '@/types/api';
import { formatDate, todayIso } from '@/utils/date';
import { getErrorMessage } from '@/utils/errorMessage';
import { estimateWorkoutTemplateSeconds } from '@/utils/workoutDuration';

interface DayWorkoutCard {
  event: CalendarEventResponse;
  session: WorkoutSessionResponse;
  template?: WorkoutTemplateResponse;
}

const route = useRoute();
const router = useRouter();
const planning = usePlanningStore();
const workouts = useWorkoutStore();
const eventOpen = ref(false);
const workoutOpen = ref(false);
const selectedEvent = ref<CalendarEventResponse | null>(null);
const feedback = ref('');
const error = ref('');
const eventFormError = ref('');
const eventFormFieldErrors = ref<Record<string, string | string[]>>({});

const date = computed(() => (route.params.date as string | undefined) ?? todayIso());
const plan = computed(() => planning.currentPlan);
const visibleDayWorkoutCards = computed<DayWorkoutCard[]>(() => {
  const sessionsById = new Map(workouts.daySessions.map((session) => [session.id, session]));
  return planning.events.reduce<DayWorkoutCard[]>((cards, event) => {
    if (event.type !== 'WORKOUT' || event.workoutSessionId == null) {
      return cards;
    }
    const session = sessionsById.get(event.workoutSessionId);
    if (session) {
      const templateId = event.workoutTemplateId ?? session.templateId;
      const template = workouts.templates.find((item) => item.id === templateId);
      cards.push({ event, session, template });
    }
    return cards;
  }, []);
});

const load = async () => {
  await Promise.all([planning.loadDay(date.value), workouts.loadTemplates(), workouts.loadDaySessions(date.value)]);
};

const clearEventFormErrors = () => {
  eventFormError.value = '';
  eventFormFieldErrors.value = {};
};

const openEventModal = () => {
  clearEventFormErrors();
  eventOpen.value = true;
};

const openWorkoutModal = () => {
  clearEventFormErrors();
  workoutOpen.value = true;
};

const openSelectedEventModal = (event: CalendarEventResponse) => {
  clearEventFormErrors();
  selectedEvent.value = event;
};

const workoutCardStepCount = (card: DayWorkoutCard) => {
  const template = card.template;
  if (!template) return card.session.exercises.length;
  const advancedCount = (template.steps?.length ?? 0) + (template.blocks ?? []).reduce((sum, block) => sum + block.steps.length, 0);
  return advancedCount || template.exercises.length;
};

const workoutCardDescription = (card: DayWorkoutCard) => {
  if (!card.template) return 'Scheda non disponibile';
  return card.session.participants.map((participant) => participant.displayName).join(', ') || card.template.description || '';
};

const openWorkoutSessionDetail = (card: DayWorkoutCard) => {
  const templateId = card.template?.id ?? card.session.templateId;
  if (!templateId) return;
  router.push({ path: `/workouts/${templateId}`, query: { workoutSessionId: String(card.session.id), eventDate: card.event.eventDate } });
};

const closeEventModal = () => {
  clearEventFormErrors();
  eventOpen.value = false;
};

const closeWorkoutModal = () => {
  clearEventFormErrors();
  workoutOpen.value = false;
};

const closeSelectedEventModal = () => {
  clearEventFormErrors();
  selectedEvent.value = null;
};

const extractFieldErrors = (err: unknown) => {
  if (!axios.isAxiosError(err)) return {};
  const data = err.response?.data as { fieldErrors?: Record<string, string | string[]>; errors?: Record<string, string | string[]> } | undefined;
  return data?.fieldErrors ?? data?.errors ?? {};
};

const changeContext = async (contextId: number | null, recurrenceType: RecurrenceType = 'NONE', recurrenceUntil: string | null = null) => {
  try {
    await planning.setDayContext(date.value, contextId, recurrenceType, recurrenceUntil);
    feedback.value = recurrenceType === 'NONE' ? 'Contesto applicato.' : 'Contesto ricorrente applicato.';
    error.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  }
};

const createContext = async (payload: DayContextRequest) => {
  try {
    const saved = await planning.saveContext(payload);
    await changeContext(saved.id);
    feedback.value = 'Contesto salvato e applicato.';
    error.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  }
};

const saveEvent = async (payload: CalendarEventRequest, id?: number) => {
  try {
    await planning.saveEvent(payload, id);
    await workouts.loadDaySessions(payload.eventDate);
    eventOpen.value = false;
    selectedEvent.value = null;
    clearEventFormErrors();
    feedback.value = id ? 'Evento modificato.' : 'Evento creato.';
    error.value = '';
    return true;
  } catch (err) {
    eventFormError.value = getErrorMessage(err);
    eventFormFieldErrors.value = extractFieldErrors(err);
    error.value = '';
    return false;
  }
};

const saveWorkoutEvent = async (payload: CalendarEventRequest) => {
  const saved = await saveEvent({ ...payload, type: 'WORKOUT', color: payload.color || '#16a34a' });
  if (!saved) return;
  workoutOpen.value = false;
  feedback.value = 'Allenamento aggiunto alla giornata.';
};

const deleteEvent = async (event: CalendarEventResponse) => {
  try {
    await planning.removeEvent(event.eventDate, event.id);
    await workouts.loadDaySessions(event.eventDate);
    selectedEvent.value = null;
    clearEventFormErrors();
    feedback.value = event.owner === false ? 'Evento rimosso per te.' : 'Evento eliminato.';
    error.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  }
};

const linkParticipantWorkout = async (event: CalendarEventResponse, templateId: number) => {
  try {
    const updated = await planning.linkWorkoutToEvent(event.eventDate, event.id, templateId);
    await workouts.loadDaySessions(event.eventDate);
    selectedEvent.value = updated;
    clearEventFormErrors();
    feedback.value = 'Scheda personale collegata.';
    error.value = '';
  } catch (err) {
    eventFormError.value = getErrorMessage(err);
    eventFormFieldErrors.value = extractFieldErrors(err);
    error.value = '';
  }
};

onMounted(load);
watch(date, load);
</script>
