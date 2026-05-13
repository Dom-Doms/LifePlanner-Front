<template>
  <section class="panel notification-card">
    <div class="panel__header">
      <div>
        <h2>Notifiche</h2>
        <p>{{ statusLabel }}</p>
      </div>
    </div>

    <p class="empty-state">{{ helperText }}</p>
    <p v-if="isIos" class="empty-state">Su iPhone le notifiche funzionano solo se l'app e aggiunta alla schermata Home.</p>
    <p v-if="feedback" class="success-text">{{ feedback }}</p>
    <p v-if="error" class="error-text">{{ error }}</p>

    <div class="card-actions card-actions--wrap">
      <button class="primary-btn" type="button" :disabled="!canEnable || loading" @click="enable">
        Attiva notifiche
      </button>
      <button class="secondary-btn" type="button" :disabled="!supported || !subscribed || loading" @click="disable">
        Disattiva notifiche
      </button>
      <button class="secondary-btn" type="button" :disabled="!canSendTest || loading" @click="sendTest">
        Invia notifica di test
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  getExistingSubscription,
  getNotificationPermission,
  getVapidPublicKey,
  isPushSupported,
  sendTestNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/services/pushNotificationService';
import { getErrorMessage } from '@/utils/errorMessage';

const supported = ref(false);
const permission = ref<NotificationPermission | 'unsupported'>('default');
const subscribed = ref(false);
const vapidConfigured = ref(false);
const loading = ref(false);
const feedback = ref('');
const error = ref('');

const isIos = computed(() => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const canEnable = computed(() => supported.value && vapidConfigured.value && permission.value !== 'denied');
const canSendTest = computed(() => supported.value && vapidConfigured.value && permission.value === 'granted' && subscribed.value);

const statusLabel = computed(() => {
  if (!supported.value) return 'Non supportate';
  if (permission.value === 'granted') return 'Consentite';
  if (permission.value === 'denied') return 'Bloccate';
  return 'Non richieste';
});

const helperText = computed(() => {
  if (!supported.value) return 'Questo browser non supporta Web Push per la PWA.';
  if (!vapidConfigured.value) return 'Le notifiche push non sono ancora configurate sul server.';
  if (permission.value === 'denied') return 'Le notifiche sono bloccate: riattivale dalle impostazioni del browser.';
  if (permission.value === 'granted') {
    return subscribed.value
      ? 'Le notifiche push sono attive per questo dispositivo.'
      : 'Permesso concesso: puoi attivare la subscription push per questo dispositivo.';
  }
  return 'Ricevi promemoria anche quando la PWA non e aperta, dove supportato.';
});

const refresh = async () => {
  supported.value = isPushSupported();
  permission.value = getNotificationPermission();
  subscribed.value = Boolean(await getExistingSubscription());
  if (!supported.value) {
    vapidConfigured.value = false;
    return;
  }
  try {
    await getVapidPublicKey();
    vapidConfigured.value = true;
  } catch {
    vapidConfigured.value = false;
  }
};

const enable = async () => {
  loading.value = true;
  feedback.value = '';
  error.value = '';
  try {
    await subscribeToPushNotifications();
    await refresh();
    feedback.value = 'Notifiche attivate su questo dispositivo.';
  } catch (err) {
    error.value = getErrorMessage(err);
    await refresh();
  } finally {
    loading.value = false;
  }
};

const disable = async () => {
  loading.value = true;
  feedback.value = '';
  error.value = '';
  try {
    await unsubscribeFromPushNotifications();
    await refresh();
    feedback.value = 'Notifiche disattivate su questo dispositivo.';
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
};

const sendTest = async () => {
  loading.value = true;
  feedback.value = '';
  error.value = '';
  try {
    await sendTestNotification();
    feedback.value = 'Notifica di test inviata.';
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
};

onMounted(refresh);
</script>
