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
      <button class="primary-btn" type="button" @click="eventOpen = true">+ Evento</button>
      <button class="secondary-btn" type="button" @click="workoutOpen = true">+ Allenamento</button>
    </section>

    <p v-if="feedback" class="success-text">{{ feedback }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <DayTimeline :events="planning.events" @select="selectedEvent = $event" />

    <section v-if="workouts.daySessions.length" class="panel">
      <div class="panel__header">
        <h2>Dettaglio allenamento</h2>
        <RouterLink to="/workouts">Apri</RouterLink>
      </div>
      <WorkoutCard
        v-for="session in workouts.daySessions"
        :key="session.id"
        :title="session.title"
        :description="session.participants.map((p) => p.displayName).join(', ')"
        :count="session.exercises.length"
      />
    </section>
    <EventFormModal v-if="eventOpen" :date="date" @close="eventOpen = false" @save="saveEvent" />
    <EventFormModal
      v-if="workoutOpen"
      title="Aggiungi allenamento"
      :date="date"
      :templates="workouts.templates"
      workout-mode
      @close="workoutOpen = false"
      @save="saveWorkoutEvent"
    />
    <EventFormModal
      v-if="selectedEvent"
      :date="date"
      :event="selectedEvent"
      :templates="workouts.templates"
      @close="selectedEvent = null"
      @save="saveEvent"
      @delete="deleteEvent"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import ContextSelector from '@/components/ContextSelector.vue';
import DayTimeline from '@/components/DayTimeline.vue';
import EventFormModal from '@/components/EventFormModal.vue';
import WorkoutCard from '@/components/WorkoutCard.vue';
import { usePlanningStore } from '@/stores/planningStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import type { CalendarEventRequest, CalendarEventResponse, DayContextRequest, RecurrenceType } from '@/types/api';
import { formatDate, todayIso } from '@/utils/date';
import { getErrorMessage } from '@/utils/errorMessage';

const route = useRoute();
const planning = usePlanningStore();
const workouts = useWorkoutStore();
const eventOpen = ref(false);
const workoutOpen = ref(false);
const selectedEvent = ref<CalendarEventResponse | null>(null);
const feedback = ref('');
const error = ref('');

const date = computed(() => (route.params.date as string | undefined) ?? todayIso());
const plan = computed(() => planning.currentPlan);

const load = async () => {
  await Promise.all([planning.loadDay(date.value), workouts.loadTemplates(), workouts.loadDaySessions(date.value)]);
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
    feedback.value = id ? 'Evento modificato.' : 'Evento creato.';
    error.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  }
};

const saveWorkoutEvent = async (payload: CalendarEventRequest) => {
  await saveEvent({ ...payload, type: 'WORKOUT', color: payload.color || '#16a34a' });
  workoutOpen.value = false;
  feedback.value = 'Allenamento aggiunto alla giornata.';
};

const deleteEvent = async (event: CalendarEventResponse) => {
  try {
    await planning.removeEvent(event.eventDate, event.id);
    await workouts.loadDaySessions(event.eventDate);
    selectedEvent.value = null;
    feedback.value = 'Evento eliminato.';
    error.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  }
};

onMounted(load);
watch(date, load);
</script>
