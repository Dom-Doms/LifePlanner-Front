<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>Nuovo account</h1>
      <input v-model.trim="username" required placeholder="Username" />
      <input v-model.trim="email" type="email" required placeholder="Email" />
      <input v-model="password" type="password" required minlength="6" placeholder="Password" />
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="primary-btn" type="submit">Registrati</button>
      <RouterLink to="/login">Hai gia un account?</RouterLink>
    </form>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/utils/errorMessage';

const auth = useAuthStore();
const router = useRouter();
const username = ref('');
const email = ref('');
const password = ref('');
const error = ref('');

const submit = async () => {
  error.value = '';
  try {
    await auth.register({ username: username.value, email: email.value, password: password.value });
    await router.push('/login');
  } catch (err) {
    error.value = getErrorMessage(err);
  }
};
</script>
