<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>Recupera password</h1>
      <p>Inserisci l'email del tuo account.</p>
      <input v-model.trim="email" type="email" required placeholder="Email" />
      <p v-if="message" class="success-text">{{ message }}</p>
      <p v-if="error" class="error-text">{{ error }}</p>
      <button class="primary-btn" type="submit" :disabled="loading">Invia istruzioni</button>
      <RouterLink to="/login">Torna al login</RouterLink>
    </form>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { forgotPassword } from '@/api/authApi';
import { getErrorMessage } from '@/utils/errorMessage';

const email = ref('');
const loading = ref(false);
const message = ref('');
const error = ref('');

const submit = async () => {
  loading.value = true;
  message.value = '';
  error.value = '';
  try {
    const response = await forgotPassword({ email: email.value });
    message.value = response.message;
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
};
</script>
