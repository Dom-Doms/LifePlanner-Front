<template>
  <article class="workout-card workout-card--rich">
    <div>
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
      <div class="workout-card__meta">
        <span>{{ count }} esercizi</span>
        <span>{{ durationLabel }}</span>
        <span v-if="groups">{{ groups }} gruppi</span>
        <span v-if="lastUsed">Ultimo: {{ lastUsed }}</span>
      </div>
    </div>
    <slot />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  description?: string | null;
  count: number;
  groups?: number;
  durationSeconds?: number | null;
  lastUsed?: string | null;
}>();

const durationLabel = computed(() => {
  const total = props.durationSeconds ?? 0;
  if (!total) return 'Durata n/d';
  const minutes = Math.max(1, Math.round(total / 60));
  return `${minutes} min`;
});
</script>
