<template>
  <section class="panel">
    <div class="panel__header">
      <h2>Timeline</h2>
      <span>{{ events.length }} eventi</span>
    </div>
    <div v-if="allDayEvents.length" class="all-day">
      <article v-for="event in allDayEvents" :key="event.id" class="event-card event-card--all-day">
        <strong>{{ event.title }}</strong>
        <small>Tutto il giorno</small>
      </article>
    </div>
    <div class="timeline">
      <article v-for="event in timedEvents" :key="event.id" class="timeline-item">
        <time>{{ event.startTime?.slice(0, 5) }}<span>{{ event.endTime?.slice(0, 5) }}</span></time>
        <div class="event-card">
          <strong>{{ event.title }}</strong>
          <small>{{ event.type }}<span v-if="event.location"> - {{ event.location }}</span></small>
          <p v-if="event.participants.length">{{ event.participants.map((p) => p.displayName).join(', ') }}</p>
        </div>
      </article>
      <p v-if="!events.length" class="empty-state">Nessun evento per questa giornata.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CalendarEventResponse } from '@/types/api';

const props = defineProps<{
  events: CalendarEventResponse[];
}>();

const allDayEvents = computed(() => props.events.filter((event) => event.allDay));
const timedEvents = computed(() =>
  props.events.filter((event) => !event.allDay).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
);
</script>
