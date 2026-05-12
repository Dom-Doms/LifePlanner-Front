<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>LifePlanner</h1>
      <p>Accedi alla tua agenda personale.</p>
      <input v-model.trim="email" type="email" required placeholder="Email" />
      <input v-model="password" type="password" required placeholder="Password" />
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="primary-btn" type="submit" :disabled="auth.loading">Accedi</button>
      <RouterLink to="/register">Crea account</RouterLink>
    </form>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/utils/errorMessage';
import { todayIso } from '@/utils/date';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const email = ref('user@example.com');
const password = ref('password');
const error = ref('');

const submit = async () => {
  error.value = '';
  try {
    await auth.login({ email: email.value, password: password.value });
    await router.push((route.query.redirect as string | undefined) ?? `/day/${todayIso()}`);
  } catch (err) {
    error.value = getErrorMessage(err);
  }
};
</script>
