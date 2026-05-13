<template>
  <AppLayout>
    <section class="page-header page-header--row">
      <button class="icon-btn" type="button" @click="moveMonth(-1)">&lt;</button>
      <div>
        <h1>Calendario</h1>
        <p>{{ monthLabel }}</p>
      </div>
      <button class="icon-btn" type="button" @click="moveMonth(1)">&gt;</button>
    </section>
    <section class="calendar-grid">
      <RouterLink
        v-for="day in monthDays"
        :key="day"
        class="calendar-day"
        :class="{ 'calendar-day--context': !!planByDate(day)?.context }"
        :style="contextStyle(day)"
        :to="`/day/${day}`"
      >
        <strong>{{ Number(day.slice(-2)) }}</strong>
        <small v-if="planByDate(day)?.context">{{ planByDate(day)?.context?.label }}</small>
        <span class="day-indicators">
          <span v-if="eventsByDate(day).length" class="dot"></span>
          <span v-if="workoutsByDate(day).length" class="gym-dot"></span>
        </span>
      </RouterLink>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppLayout from '@/components/AppLayout.vue';
import { usePlanningStore } from '@/stores/planningStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { toIsoDate } from '@/utils/date';

const planning = usePlanningStore();
const workouts = useWorkoutStore();
const current = ref(new Date());

const year = computed(() => current.value.getFullYear());
const month = computed(() => current.value.getMonth());
const firstDay = computed(() => new Date(year.value, month.value, 1));
const lastDay = computed(() => new Date(year.value, month.value + 1, 0));
const monthLabel = computed(() => new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(current.value));
const monthDays = computed(() =>
  Array.from({ length: lastDay.value.getDate() }, (_, index) => toIsoDate(new Date(year.value, month.value, index + 1))),
);

const planByDate = (date: string) => planning.monthPlans.find((plan) => plan.date === date);
const eventsByDate = (date: string) => planning.events.filter((event) => event.eventDate === date);
const workoutsByDate = (date: string) =>
  planning.events.filter((event) => event.eventDate === date && (event.type === 'GYM' || event.type === 'WORKOUT'));

const contextStyle = (date: string) => {
  const color = planByDate(date)?.context?.color;
  return color ? { '--context-color': color } : {};
};

const load = async () => {
  await Promise.all([
    planning.loadMonth(year.value, month.value + 1, toIsoDate(firstDay.value), toIsoDate(lastDay.value)),
    workouts.loadSessions(toIsoDate(firstDay.value), toIsoDate(lastDay.value)),
  ]);
};

const moveMonth = (delta: number) => {
  current.value = new Date(year.value, month.value + delta, 1);
};

onMounted(load);
watch(current, load);
</script>
