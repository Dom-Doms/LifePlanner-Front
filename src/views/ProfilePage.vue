<template>
  <AppLayout>
    <section class="page-header">
      <h1>Profilo</h1>
      <p>{{ auth.user?.email }}</p>
    </section>
    <section class="panel">
      <h2>{{ auth.user?.username }}</h2>
      <p>Ruolo: {{ auth.user?.role }}</p>
      <button class="danger-btn" type="button" @click="logout">Logout</button>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { useAuthStore } from '@/stores/authStore';

const auth = useAuthStore();
const router = useRouter();

const logout = async () => {
  auth.logout();
  await router.push('/login');
};
</script>
