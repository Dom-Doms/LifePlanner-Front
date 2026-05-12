<template>
  <nav class="bottom-nav" aria-label="Navigazione principale">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="bottom-nav__item">
      <span class="bottom-nav__icon">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
const items = [
  { to: '/day', label: 'Giornata', icon: 'D' },
  { to: '/week', label: 'Settimana', icon: 'S' },
  { to: '/calendar', label: 'Calendario', icon: 'C' },
  { to: '/workouts', label: 'Allenamento', icon: 'A' },
];
</script>
