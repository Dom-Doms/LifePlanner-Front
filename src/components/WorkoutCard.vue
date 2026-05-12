<template>
  <article class="workout-card">
    <div>
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
      <small>{{ count }} esercizi</small>
    </div>
    <slot />
  </article>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string | null;
  count: number;
}>();
</script>
