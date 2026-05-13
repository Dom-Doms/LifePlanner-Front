<template>
  <section class="panel">
    <div class="panel__header timeline-panel__header">
      <h2>Timeline</h2>
      <div class="timeline-panel__meta">
        <span>{{ events.length }} eventi</span>
        <button class="timeline-mode-toggle" type="button" @click="toggleTimelineMode">
          {{ timelineMode === 'COMPACT_EVENTS' ? 'Compatta' : 'Completa' }}
        </button>
      </div>
    </div>
    <div v-if="allDayEvents.length" class="all-day">
      <button v-for="event in allDayEvents" :key="event.id" class="event-card event-card--button event-card--all-day" type="button" @click="$emit('select', event)">
        <strong>{{ event.title }}</strong>
        <small>Tutto il giorno</small>
      </button>
    </div>
    <p v-if="!events.length" class="timeline-empty-state">Nessun evento per questa giornata.</p>
    <p v-if="showCurrentTimeChip" class="timeline-now-chip">Ora attuale: {{ currentTimeLabel }}</p>
    <div v-if="showTimelineGrid" class="timeline timeline--day-grid" :style="{ minHeight: `${timelineHeight}px` }">
      <div class="timeline-grid" aria-hidden="true">
        <div v-for="hour in visibleHours" :key="hour" class="timeline-row">
          <div class="timeline-hour-label">{{ formatHour(hour) }}</div>
          <div class="timeline-line-area"></div>
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
          <small class="timeline-event-time">{{ event.startTime?.slice(0, 5) }}<span v-if="event.endTime"> - {{ event.endTime.slice(0, 5) }}</span></small>
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

type TimelineMode = 'FULL_DAY' | 'COMPACT_EVENTS';

const props = defineProps<{
  date: string;
  events: CalendarEventResponse[];
}>();

defineEmits<{ select: [event: CalendarEventResponse] }>();

const timelineModeKey = 'lifeplanner.timelineMode';
const defaultTimelineMode: TimelineMode = 'COMPACT_EVENTS';
const pixelsPerMinute = 0.8;
const minutesPerHour = 60;
const now = ref(new Date());
const timelineMode = ref<TimelineMode>(readTimelineMode());
let intervalId: number | undefined;

const allDayEvents = computed(() => props.events.filter((event) => event.allDay));
const timedEvents = computed(() =>
  props.events.filter((event) => !event.allDay).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
);
const currentMinutes = computed(() => now.value.getHours() * minutesPerHour + now.value.getMinutes());
const visibleRange = computed(() => resolveVisibleRange(timedEvents.value, timelineMode.value, now.value, props.date));
const visibleStartMinutes = computed(() => visibleRange.value.startHour * minutesPerHour);
const visibleEndMinutes = computed(() => visibleRange.value.endHour * minutesPerHour);
const timelineHeight = computed(() => (visibleEndMinutes.value - visibleStartMinutes.value) * pixelsPerMinute);
const visibleHours = computed(() =>
  Array.from({ length: visibleRange.value.endHour - visibleRange.value.startHour }, (_, index) => visibleRange.value.startHour + index),
);
const showTimelineGrid = computed(() => visibleRange.value.endHour > visibleRange.value.startHour);
const currentTimeTop = computed(() => (currentMinutes.value - visibleStartMinutes.value) * pixelsPerMinute);
const showCurrentTimeLine = computed(() => {
  const insideVisibleRange = currentMinutes.value >= visibleStartMinutes.value && currentMinutes.value <= visibleEndMinutes.value;
  return props.date === localIsoDate(now.value) && insideVisibleRange;
});
const showCurrentTimeChip = computed(() => {
  return timelineMode.value === 'COMPACT_EVENTS' && props.date === localIsoDate(now.value) && showTimelineGrid.value && !showCurrentTimeLine.value;
});
const currentTimeLabel = computed(() =>
  `${String(now.value.getHours()).padStart(2, '0')}:${String(now.value.getMinutes()).padStart(2, '0')}`,
);
const timedEventBlocks = computed(() =>
  timedEvents.value.map((event) => {
    const start = timeToMinutes(event.startTime) ?? visibleStartMinutes.value;
    const end = timeToMinutes(event.endTime) ?? start + 45;
    const clampedStart = Math.max(start, visibleStartMinutes.value);
    const clampedEnd = Math.min(Math.max(end, clampedStart + 30), visibleEndMinutes.value);
    return {
      ...event,
      top: (clampedStart - visibleStartMinutes.value) * pixelsPerMinute,
      height: Math.max((clampedEnd - clampedStart) * pixelsPerMinute, 44),
    };
  }),
);

function readTimelineMode(): TimelineMode {
  if (typeof window === 'undefined') return defaultTimelineMode;
  const stored = window.localStorage.getItem(timelineModeKey);
  return stored === 'FULL_DAY' || stored === 'COMPACT_EVENTS' ? stored : defaultTimelineMode;
}

const toggleTimelineMode = () => {
  timelineMode.value = timelineMode.value === 'COMPACT_EVENTS' ? 'FULL_DAY' : 'COMPACT_EVENTS';
  window.localStorage.setItem(timelineModeKey, timelineMode.value);
};

const resolveVisibleRange = (events: CalendarEventResponse[], mode: TimelineMode, currentDate: Date, selectedDate: string) => {
  if (mode === 'FULL_DAY') return { startHour: 0, endHour: 24 };

  if (!events.length) {
    if (selectedDate !== localIsoDate(currentDate)) return { startHour: 0, endHour: 0 };
    const startHour = clampHour(currentDate.getHours() - 1);
    return ensureMinimumHours(startHour, clampHour(currentDate.getHours() + 2));
  }

  const ranges = events.map((event) => {
    const start = timeToMinutes(event.startTime) ?? 0;
    const end = timeToMinutes(event.endTime) ?? start + minutesPerHour;
    return { start, end: Math.max(end, start + minutesPerHour) };
  });
  const firstStart = Math.min(...ranges.map((range) => range.start));
  const lastEnd = Math.max(...ranges.map((range) => range.end));
  const startHour = clampHour(Math.floor(firstStart / minutesPerHour) - 1);
  const endHour = clampHour(Math.ceil(lastEnd / minutesPerHour) + 1);

  return ensureMinimumHours(startHour, endHour);
};

const ensureMinimumHours = (startHour: number, endHour: number) => {
  let nextStart = startHour;
  let nextEnd = Math.max(endHour, startHour + 3);
  if (nextEnd > 24) {
    nextEnd = 24;
    nextStart = Math.max(0, nextEnd - 3);
  }
  return { startHour: nextStart, endHour: nextEnd };
};

const clampHour = (hour: number) => Math.min(Math.max(hour, 0), 24);

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
