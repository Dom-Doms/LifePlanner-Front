<template>
  <AppLayout>
    <section class="page-header">
      <h1>Settimana</h1>
      <p>{{ formatShortDate(firstDay) }} - {{ formatShortDate(lastDay) }}</p>
    </section>
    <section class="day-list">
      <RouterLink v-for="day in days" :key="day" class="day-card" :style="contextStyle(day)" :to="`/day/${day}`">
        <div class="day-card__top">
          <strong>{{ formatShortDate(day) }}</strong>
          <span v-if="planByDate(day)?.context">{{ planByDate(day)?.context?.label }}</span>
        </div>
        <p>{{ eventsByDate(day).length }} eventi</p>
        <small v-if="workoutsByDate(day).length">Allenamento previsto</small>
        <ul>
          <li v-for="event in eventsByDate(day).slice(0, 2)" :key="event.id">{{ event.title }}</li>
        </ul>
      </RouterLink>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import AppLayout from '@/components/AppLayout.vue';
import { usePlanningStore } from '@/stores/planningStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { addDays, formatShortDate, startOfWeek, toIsoDate } from '@/utils/date';

const planning = usePlanningStore();
const workouts = useWorkoutStore();
const weekStart = startOfWeek(new Date());
const days = computed(() => Array.from({ length: 7 }, (_, index) => toIsoDate(addDays(weekStart, index))));
const firstDay = computed(() => days.value[0] ?? toIsoDate(weekStart));
const lastDay = computed(() => days.value[6] ?? toIsoDate(addDays(weekStart, 6)));

const planByDate = (date: string) => planning.weekPlans.find((plan) => plan.date === date);
const eventsByDate = (date: string) => planning.events.filter((event) => event.eventDate === date);
const workoutsByDate = (date: string) =>
  planning.events.filter((event) => event.eventDate === date && (event.type === 'GYM' || event.type === 'WORKOUT'));
const contextStyle = (date: string) => {
  const color = planByDate(date)?.context?.color;
  return color ? { '--context-color': color } : {};
};

onMounted(async () => {
  await Promise.all([
    planning.loadWeek(firstDay.value, lastDay.value),
    workouts.loadSessions(firstDay.value, lastDay.value),
  ]);
});
</script>
