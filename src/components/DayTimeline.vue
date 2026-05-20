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
      <button
        v-for="event in allDayEvents"
        :key="event.id"
        class="event-card event-card--button event-card--all-day"
        :class="{
          'event-card--workout': event.type === 'WORKOUT',
          'event-card--completed': event.type === 'WORKOUT' && event.completed,
        }"
        type="button"
        @click="$emit('select', event)"
      >
        <strong>{{ event.title }}</strong>
        <span v-if="event.type === 'WORKOUT' && event.completed" class="event-completed-check" aria-label="Workout completato">&#10003;</span>
      </button>
    </div>
    <p v-if="!events.length" class="timeline-empty-state">Nessun evento per questa giornata.</p>
    <p v-if="showCurrentTimeChip" class="timeline-now-chip">Ora attuale: {{ currentTimeLabel }}</p>
    <div
      v-if="showTimelineGrid"
      class="timeline timeline--day-grid"
      :style="{ minHeight: `${timelineHeight}px`, '--timeline-hour-height': `${hourHeight}px` }"
    >
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

      <div class="timeline-events-layer">
        <article
          v-for="event in timedEventBlocks"
          :key="event.id"
          class="timeline-event"
          :style="{
            top: `${event.top}px`,
            height: `${event.height}px`,
            left: `${event.leftPercent}%`,
            width: `calc(${event.widthPercent}% - 4px)`,
          }"
        >
          <button
            class="event-card event-card--button timeline-event-card"
            :class="{
              'event-card--workout': event.type === 'WORKOUT',
              'event-card--completed': event.type === 'WORKOUT' && event.completed,
              'timeline-event-card--tiny': event.isTiny,
              'timeline-event-card--compact': event.isCompact,
            }"
            type="button"
            :title="event.title"
            @click="$emit('select', event)"
          >
            <strong>{{ event.title }}</strong>
            <span v-if="event.type === 'WORKOUT' && event.completed" class="event-completed-check" aria-label="Workout completato">&#10003;</span>
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { CalendarEventResponse } from '@/types/api';

type TimelineMode = 'FULL_DAY' | 'COMPACT_EVENTS';

const props = defineProps<{
  date: string;
  events: CalendarEventResponse[];
}>();

defineEmits<{ select: [event: CalendarEventResponse] }>();

const timelineModeKey = 'lifeplanner.timelineMode';
const defaultTimelineMode: TimelineMode = 'COMPACT_EVENTS';
const hourHeight = 64;
const minutesPerHour = 60;
const compactEventHeight = 34;
const tinyEventHeight = 14;
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
const timelineHeight = computed(() => minutesToPixels(visibleEndMinutes.value - visibleStartMinutes.value));
const visibleHours = computed(() =>
  Array.from({ length: visibleRange.value.endHour - visibleRange.value.startHour }, (_, index) => visibleRange.value.startHour + index),
);
const showTimelineGrid = computed(() => visibleRange.value.endHour > visibleRange.value.startHour);
const currentTimeTop = computed(() => minutesToPixels(currentMinutes.value - visibleStartMinutes.value));
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
const timedEventBlocks = computed(() => layoutTimedEvents(timedEvents.value));

const minutesToPixels = (minutes: number) => (minutes / minutesPerHour) * hourHeight;

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
    return { start, end: Math.max(end, start) };
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

const layoutTimedEvents = (events: CalendarEventResponse[]) => {
  const normalized = events
    .map((event) => {
      const start = timeToMinutes(event.startTime) ?? visibleStartMinutes.value;
      const rawEnd = timeToMinutes(event.endTime) ?? start + minutesPerHour;
      const end = Math.max(rawEnd, start);
      const clampedStart = Math.max(start, visibleStartMinutes.value);
      const clampedEnd = Math.min(Math.max(end, clampedStart), visibleEndMinutes.value);
      return { event, start, end, clampedStart, clampedEnd };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const groups: typeof normalized[] = [];
  let currentGroup: typeof normalized = [];
  let currentGroupEnd = -1;

  normalized.forEach((item) => {
    if (!currentGroup.length || item.start < currentGroupEnd) {
      currentGroup.push(item);
      currentGroupEnd = Math.max(currentGroupEnd, item.end);
      return;
    }
    groups.push(currentGroup);
    currentGroup = [item];
    currentGroupEnd = item.end;
  });
  if (currentGroup.length) groups.push(currentGroup);

  return groups.flatMap((group) => {
    const columns: number[] = [];
    const positioned = group.map((item) => {
      const columnIndex = columns.findIndex((end) => end <= item.start);
      const nextColumnIndex = columnIndex === -1 ? columns.length : columnIndex;
      columns[nextColumnIndex] = item.end;
      return { ...item, columnIndex: nextColumnIndex };
    });
    const columnCount = Math.max(columns.length, 1);
    return positioned.map((item) => {
      const height = Math.max(minutesToPixels(item.clampedEnd - item.clampedStart), 1);
      return {
        ...item.event,
        top: minutesToPixels(item.clampedStart - visibleStartMinutes.value),
        height,
        isTiny: height < tinyEventHeight,
        isCompact: height < compactEventHeight,
        columnIndex: item.columnIndex,
        columnCount,
        widthPercent: 100 / columnCount,
        leftPercent: (item.columnIndex * 100) / columnCount,
      };
    });
  });
};

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

</script>
