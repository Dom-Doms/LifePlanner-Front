<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>Nuova password</h1>
      <p>Scegli una nuova password per il tuo account.</p>
      <input v-model="newPassword" type="password" required minlength="6" placeholder="Nuova password" />
      <input v-model="confirmPassword" type="password" required minlength="6" placeholder="Conferma password" />
      <p v-if="message" class="success-text">{{ message }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="primary-btn" type="submit" :disabled="loading || !token">Aggiorna password</button>
      <RouterLink to="/login">Torna al login</RouterLink>
    </form>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { resetPassword } from '@/api/authApi';
import { getErrorMessage } from '@/utils/errorMessage';

const route = useRoute();
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const message = ref('');
const error = ref('');

const submit = async () => {
  message.value = '';
  error.value = '';
  if (!token.value) {
    error.value = 'Link di reset non valido.';
    return;
  }
  if (newPassword.value.length < 6) {
    error.value = 'La password deve avere almeno 6 caratteri.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Le password non coincidono.';
    return;
  }
  loading.value = true;
  try {
    const response = await resetPassword({ token: token.value, newPassword: newPassword.value });
    message.value = response.message;
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
};
</script>
