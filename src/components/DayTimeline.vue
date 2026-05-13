<template>
  <section class="panel">
    <div class="panel__header">
      <h2>Timeline</h2>
      <span>{{ events.length }} eventi</span>
    </div>
    <div v-if="allDayEvents.length" class="all-day">
      <button v-for="event in allDayEvents" :key="event.id" class="event-card event-card--button event-card--all-day" type="button" @click="$emit('select', event)">
        <strong>{{ event.title }}</strong>
        <small>Tutto il giorno</small>
      </button>
    </div>
    <p v-if="!events.length" class="timeline-empty-state">Nessun evento per questa giornata.</p>
    <div class="timeline timeline--day-grid" :style="{ minHeight: `${timelineHeight}px` }">
      <div class="timeline-grid" aria-hidden="true">
        <div v-for="hour in hours" :key="hour" class="timeline-hour">
          <span>{{ formatHour(hour) }}</span>
        </div>
      </div>

      <div
        v-if="showCurrentTimeLine"
        class="current-time-line"
        :style="{ top: `${currentTimeTop}px` }"
        aria-hidden="true"
      >
        <span class="current-time-dot"></span>
        <span class="current-time-label">{{ currentTimeLabel }}</span>
      </div>

      <article
        v-for="event in timedEventBlocks"
        :key="event.id"
        class="timeline-item timeline-item--positioned"
        :style="{ top: `${event.top}px`, minHeight: `${event.height}px` }"
      >
        <time>{{ event.startTime?.slice(0, 5) }}<span>{{ event.endTime?.slice(0, 5) }}</span></time>
        <button class="event-card event-card--button" type="button" @click="$emit('select', event)">
          <strong>{{ event.title }}</strong>
          <small>{{ labelFor(event.type) }}<span v-if="event.location"> - {{ event.location }}</span></small>
          <p v-if="event.participants.length">{{ event.participants.map((p) => p.displayName).join(', ') }}</p>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { CalendarEventResponse, EventType } from '@/types/api';

const props = defineProps<{
  date: string;
  events: CalendarEventResponse[];
}>();

defineEmits<{ select: [event: CalendarEventResponse] }>();

const startHour = 0;
const endHour = 24;
const pixelsPerMinute = 0.8;
const minutesPerHour = 60;
const timelineStartMinutes = startHour * minutesPerHour;
const timelineEndMinutes = endHour * minutesPerHour;
const timelineHeight = (timelineEndMinutes - timelineStartMinutes) * pixelsPerMinute;
const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
const now = ref(new Date());
let intervalId: number | undefined;

const allDayEvents = computed(() => props.events.filter((event) => event.allDay));
const timedEvents = computed(() =>
  props.events.filter((event) => !event.allDay).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
);
const currentMinutes = computed(() => now.value.getHours() * minutesPerHour + now.value.getMinutes());
const currentTimeTop = computed(() => (currentMinutes.value - timelineStartMinutes) * pixelsPerMinute);
const showCurrentTimeLine = computed(() => {
  const insideVisibleRange = currentMinutes.value >= timelineStartMinutes && currentMinutes.value <= timelineEndMinutes;
  return props.date === localIsoDate(now.value) && insideVisibleRange;
});
const currentTimeLabel = computed(() =>
  `${String(now.value.getHours()).padStart(2, '0')}:${String(now.value.getMinutes()).padStart(2, '0')}`,
);
const timedEventBlocks = computed(() =>
  timedEvents.value.map((event) => {
    const start = timeToMinutes(event.startTime) ?? timelineStartMinutes;
    const end = timeToMinutes(event.endTime) ?? start + 45;
    const clampedStart = Math.max(start, timelineStartMinutes);
    const clampedEnd = Math.min(Math.max(end, clampedStart + 30), timelineEndMinutes);
    return {
      ...event,
      top: (clampedStart - timelineStartMinutes) * pixelsPerMinute,
      height: Math.max((clampedEnd - clampedStart) * pixelsPerMinute, 38),
    };
  }),
);

const localIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const timeToMinutes = (time?: string | null) => {
  if (!time) return null;
  const [hoursPart, minutesPart] = time.slice(0, 5).split(':');
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * minutesPerHour + minutes;
};

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

onMounted(() => {
  intervalId = window.setInterval(() => {
    now.value = new Date();
  }, 60000);
});

onUnmounted(() => {
  window.clearInterval(intervalId);
});

const labels: Record<EventType, string> = {
  STUDY: 'Studio',
  EXAM: 'Esame',
  PERSONAL: 'Personale',
  GYM: 'Palestra',
  WORKOUT: 'Allenamento',
  OTHER: 'Altro',
};

const labelFor = (type: EventType) => labels[type] ?? type;
</script>
