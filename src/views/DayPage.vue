<template>
  <AppLayout>
    <section class="page-header">
      <div>
        <h1>La tua giornata <span v-if="plan?.context">- {{ plan.context.label }}</span></h1>
        <p>{{ formatDate(date) }}</p>
      </div>
      <RouterLink to="/profile" class="icon-btn">P</RouterLink>
    </section>

    <section class="quick-actions">
      <button class="secondary-btn" type="button" @click="contextOpen = !contextOpen">Cambia contesto</button>
      <button class="primary-btn" type="button" @click="eventOpen = true">Aggiungi evento</button>
      <button class="secondary-btn" type="button" @click="assignWorkout">Aggiungi allenamento</button>
    </section>

    <ContextSelector
      v-if="contextOpen"
      :contexts="planning.contexts"
      :selected-id="plan?.context?.id ?? null"
      @change="changeContext"
      @create="createContext"
    />

    <section v-if="workouts.daySessions.length" class="panel">
      <div class="panel__header">
        <h2>Allenamento</h2>
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

    <DayTimeline :events="planning.events" />
    <EventFormModal v-if="eventOpen" :date="date" @close="eventOpen = false" @save="saveEvent" />
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
import type { CalendarEventRequest, DayContextRequest } from '@/types/api';
import { formatDate, todayIso } from '@/utils/date';

const route = useRoute();
const planning = usePlanningStore();
const workouts = useWorkoutStore();
const contextOpen = ref(false);
const eventOpen = ref(false);

const date = computed(() => (route.params.date as string | undefined) ?? todayIso());
const plan = computed(() => planning.currentPlan);

const load = async () => {
  await Promise.all([planning.loadDay(date.value), workouts.loadTemplates(), workouts.loadDaySessions(date.value)]);
};

const changeContext = async (contextId: number | null) => {
  await planning.setDayContext(date.value, contextId);
};

const createContext = async (payload: DayContextRequest) => {
  await planning.saveContext(payload);
};

const saveEvent = async (payload: CalendarEventRequest) => {
  await planning.saveEvent(payload);
  eventOpen.value = false;
};

const assignWorkout = async () => {
  const first = workouts.templates[0];
  if (!first) return;
  await workouts.assignFromTemplate({
    templateId: first.id,
    date: date.value,
    title: first.name,
    notes: '',
    participants: [],
  });
};

onMounted(load);
watch(date, load);
</script>
