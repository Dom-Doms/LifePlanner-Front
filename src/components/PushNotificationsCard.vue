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
  getVapidPublicKey,
  refreshPushStatus,
  sendTestNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushNotificationStatus,
} from '@/services/pushNotificationService';
import { getErrorMessage } from '@/utils/errorMessage';

const status = ref<PushNotificationStatus>('permissionDefault');
const permission = ref<NotificationPermission | 'unsupported'>('default');
const subscribed = ref(false);
const vapidConfigured = ref(false);
const loading = ref(false);
const feedback = ref('');
const error = ref('');

const isIos = computed(() => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const supported = computed(() => status.value !== 'unsupported');
const canEnable = computed(() => supported.value && vapidConfigured.value && permission.value !== 'denied' && status.value !== 'active');
const canSendTest = computed(() => supported.value && vapidConfigured.value && status.value === 'active' && subscribed.value);

const statusLabel = computed(() => {
  if (status.value === 'unsupported') return 'Non supportate';
  if (status.value === 'active') return 'Notifiche attive';
  if (status.value === 'permissionDenied') return 'Notifiche bloccate';
  if (status.value === 'permissionGrantedNoSubscription') return 'Permesso concesso';
  if (status.value === 'backendError') return 'Errore server';
  return 'Non richieste';
});

const helperText = computed(() => {
  if (status.value === 'unsupported') return 'Questo browser non supporta Web Push per la PWA.';
  if (status.value === 'permissionDenied') return 'Le notifiche sono bloccate: riattivale dalle impostazioni del browser.';
  if (status.value === 'permissionGrantedNoSubscription') return 'Permesso concesso, notifiche non ancora attive.';
  if (status.value === 'backendError') return 'Permesso concesso, ma salvataggio sul server non riuscito.';
  if (status.value === 'active') return 'Notifiche attive.';
  if (!vapidConfigured.value) return 'Le notifiche push non sono ancora configurate sul server.';
  return 'Ricevi promemoria anche quando la PWA non e aperta, dove supportato.';
});

const refresh = async ({ clearMessages = false } = {}) => {
  if (clearMessages) {
    feedback.value = '';
    error.value = '';
  }
  const result = await refreshPushStatus();
  status.value = result.status;
  permission.value = result.permission;
  subscribed.value = Boolean(result.subscription);
  if (result.status === 'backendError') {
    error.value = 'Permesso concesso, ma salvataggio sul server non riuscito.';
  }
  if (result.status === 'unsupported') {
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
    await refresh({ clearMessages: false });
    if (status.value === 'active') {
      feedback.value = 'Notifiche attivate su questo dispositivo.';
    }
  } catch (err) {
    error.value = getErrorMessage(err);
    await refresh({ clearMessages: false });
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
    await refresh({ clearMessages: false });
    feedback.value = 'Notifiche disattivate su questo dispositivo.';
  } catch (err) {
    error.value = getErrorMessage(err);
    await refresh({ clearMessages: false });
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

onMounted(() => refresh({ clearMessages: true }));
</script>
