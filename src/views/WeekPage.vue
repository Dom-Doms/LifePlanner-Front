<template>
  <AppLayout>
    <section class="page-header page-header--row">
      <button class="icon-btn icon-btn--light" type="button" @click="moveWeek(-1)">&lt;</button>
      <div>
        <h1>Settimana</h1>
        <p>{{ formatShortDate(firstDay) }} - {{ formatShortDate(lastDay) }}</p>
      </div>
      <button class="icon-btn icon-btn--light" type="button" @click="moveWeek(1)">&gt;</button>
    </section>

    <section class="week-summary panel">
      <strong>{{ weekEventCount }} eventi nella settimana</strong>
      <p>{{ weekWorkoutCount }} allenamenti previsti</p>
    </section>

    <section class="day-list week-list">
      <RouterLink
        v-for="day in days"
        :key="day"
        class="day-card week-day-card"
        :class="{ 'week-day-card--today': day === today }"
        :style="contextStyle(day)"
        :to="`/day/${day}`"
      >
        <div class="day-card__top">
          <div class="week-day-card__date">
            <strong>{{ formatWeekday(day) }}</strong>
            <span>{{ formatDayNumber(day) }}</span>
          </div>
          <span v-if="day === today" class="week-pill week-pill--today">Oggi</span>
          <span v-else-if="planByDate(day)?.context" class="week-pill">{{ planByDate(day)?.context?.label }}</span>
        </div>

        <div class="week-day-card__meta">
          <span>{{ eventsByDate(day).length }} eventi</span>
          <span v-if="workoutsByDate(day).length">Allenamento</span>
        </div>

        <ul v-if="eventsByDate(day).length" class="week-event-list">
          <li v-for="event in eventsByDate(day).slice(0, 3)" :key="event.id">
            <span>{{ event.allDay ? 'Tutto il giorno' : event.startTime?.slice(0, 5) }}</span>
            <strong>{{ event.title }}</strong>
          </li>
        </ul>
        <p v-else class="empty-state">Nessun evento.</p>
        <small v-if="eventsByDate(day).length > 3" class="week-more">+{{ eventsByDate(day).length - 3 }} altri</small>
      </RouterLink>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppLayout from '@/components/AppLayout.vue';
import { usePlanningStore } from '@/stores/planningStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { addDays, formatShortDate, startOfWeek, todayIso, toIsoDate } from '@/utils/date';

const planning = usePlanningStore();
const workouts = useWorkoutStore();
const current = ref(new Date());
const weekStart = computed(() => startOfWeek(current.value));
const days = computed(() => Array.from({ length: 7 }, (_, index) => toIsoDate(addDays(weekStart.value, index))));
const firstDay = computed(() => days.value[0] ?? toIsoDate(weekStart.value));
const lastDay = computed(() => days.value[6] ?? toIsoDate(addDays(weekStart.value, 6)));
const today = todayIso();
const weekEventCount = computed(() => days.value.reduce((total, day) => total + eventsByDate(day).length, 0));
const weekWorkoutCount = computed(() => days.value.reduce((total, day) => total + workoutsByDate(day).length, 0));

const planByDate = (date: string) => planning.weekPlans.find((plan) => plan.date === date);
const eventsByDate = (date: string) =>
  planning.events
    .filter((event) => event.eventDate === date)
    .sort((a, b) => (a.startTime ?? '00:00').localeCompare(b.startTime ?? '00:00'));
const workoutsByDate = (date: string) =>
  planning.events.filter((event) => event.eventDate === date && (event.type === 'GYM' || event.type === 'WORKOUT'));
const contextStyle = (date: string) => {
  const color = planByDate(date)?.context?.color;
  return color ? { '--context-color': color } : {};
};

const formatWeekday = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(new Date(`${iso}T00:00:00`));
const formatDayNumber = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`));

const load = async () => {
  await Promise.all([
    planning.loadWeek(firstDay.value, lastDay.value),
    workouts.loadSessions(firstDay.value, lastDay.value),
  ]);
};

const moveWeek = (delta: number) => {
  current.value = addDays(current.value, delta * 7);
};

onMounted(load);
watch(current, load);
</script>
