<template>
  <div class="app-shell">
    <main class="app-main">
      <slot />
    </main>
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import BottomNav from './BottomNav.vue';
</script>
