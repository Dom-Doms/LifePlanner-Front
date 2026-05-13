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
    <section class="panel">
      <div class="panel__header">
        <div>
          <h2>Aspetto</h2>
          <p>Tema dell'app</p>
        </div>
      </div>
      <div class="theme-options" role="group" aria-label="Tema">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          class="theme-option"
          :class="{ 'theme-option--active': themePreference === option.value }"
          type="button"
          @click="changeTheme(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>
    <PushNotificationsCard />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import PushNotificationsCard from '@/components/PushNotificationsCard.vue';
import { useAuthStore } from '@/stores/authStore';
import { getStoredThemePreference, setThemePreference, type ThemePreference } from '@/utils/theme';

const auth = useAuthStore();
const router = useRouter();
const themePreference = ref<ThemePreference>(getStoredThemePreference());
const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
];

const changeTheme = (preference: ThemePreference) => {
  themePreference.value = preference;
  setThemePreference(preference);
};

const logout = async () => {
  auth.logout();
  await router.push('/login');
};
</script>
