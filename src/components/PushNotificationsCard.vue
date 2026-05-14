<template>
  <section class="panel notification-card">
    <div class="panel__header notification-card__header">
      <div class="notification-card__heading">
        <h2>Notifiche</h2>
      </div>
      <span class="notification-status-badge" :class="statusBadgeClass">{{ statusBadgeLabel }}</span>
    </div>

    <p class="notification-card__description">{{ helperText }}</p>

    <p v-if="alertMessage" class="notification-alert" :class="alertClass" role="status">
      {{ alertMessage }}
    </p>

    <div class="notification-actions" aria-label="Azioni notifiche">
      <button v-if="canEnable" class="primary-btn notification-actions__primary" type="button" :disabled="loading" @click="enable">
        Attiva notifiche
      </button>
      <div class="notification-actions__secondary">
        <button class="secondary-btn" type="button" :disabled="!canSendTest || loading" @click="sendTest">
          Invia test
        </button>
        <button v-if="canRegenerate" class="secondary-btn" type="button" :disabled="loading || !vapidConfigured" @click="regenerate">
          Rigenera
        </button>
        <button class="danger-btn notification-actions__danger" type="button" :disabled="!supported || !subscribed || loading" @click="disable">
          Disattiva
        </button>
      </div>
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
const testFailed = ref(false);

const isIos = computed(() => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const supported = computed(() => status.value !== 'unsupported');
const canEnable = computed(() => supported.value && vapidConfigured.value && permission.value !== 'denied' && status.value !== 'active');
const canSendTest = computed(() => supported.value && vapidConfigured.value && status.value === 'active' && subscribed.value);
const canRegenerate = computed(() => supported.value && permission.value === 'granted');

const statusBadgeLabel = computed(() => {
  if (status.value === 'active') return 'Attive';
  if (status.value === 'permissionDenied') return 'Bloccate';
  return 'Non attive';
});

const statusBadgeClass = computed(() => {
  if (status.value === 'active') return 'notification-status-badge--active';
  if (status.value === 'permissionDenied') return 'notification-status-badge--blocked';
  return 'notification-status-badge--inactive';
});

const helperText = computed(() => {
  if (status.value === 'unsupported') return 'Questo browser non supporta Web Push per la PWA.';
  if (status.value === 'permissionDenied') return 'Le notifiche sono bloccate: riattivale dalle impostazioni del browser.';
  if (status.value === 'permissionGrantedNoSubscription') return 'Permesso concesso, notifiche non ancora attive.';
  if (status.value === 'backendError') return 'Permesso concesso, ma salvataggio sul server non riuscito.';
  if (status.value === 'active') return 'Riceverai promemoria per gli eventi con notifica attiva.';
  if (!vapidConfigured.value) return 'Le notifiche push non sono ancora configurate sul server.';
  if (isIos.value) return "Su iPhone le notifiche funzionano solo se l'app e aggiunta alla schermata Home.";
  return 'Ricevi promemoria anche quando la PWA non e aperta.';
});

const alertMessage = computed(() => error.value || feedback.value);

const alertClass = computed(() => {
  if (error.value) return 'notification-alert--error';
  if (feedback.value) return 'notification-alert--success';
  return 'notification-alert--info';
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
    await subscribeToPushNotifications(status.value !== 'active' || testFailed.value);
    await refresh({ clearMessages: false });
    if (status.value === 'active') {
      feedback.value = 'Notifiche attivate su questo dispositivo.';
      testFailed.value = false;
    }
  } catch (err) {
    error.value = getErrorMessage(err);
    await refresh({ clearMessages: false });
  } finally {
    loading.value = false;
  }
};

const regenerate = async () => {
  loading.value = true;
  feedback.value = '';
  error.value = '';
  try {
    await subscribeToPushNotifications(true);
    await refresh({ clearMessages: false });
    if (status.value === 'active') {
      feedback.value = 'Notifiche rigenerate su questo dispositivo.';
      testFailed.value = false;
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
    testFailed.value = false;
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
    const result = await sendTestNotification();
    if (result.activeSubscriptions === 0) {
      testFailed.value = true;
      error.value = result.errors[0] ?? 'Nessun dispositivo attivo per le notifiche. Disattiva e riattiva le notifiche.';
      return;
    }
    if (result.failed > 0) {
      testFailed.value = true;
      error.value = result.errors[0] ?? 'Invio notifica fallito. Controlla configurazione VAPID o subscription.';
      return;
    }
    if (result.sent > 0) {
      testFailed.value = false;
      feedback.value = 'Notifica di test inviata.';
      return;
    }
    testFailed.value = true;
    error.value = 'Nessun invio notifica confermato dal server.';
  } catch (err) {
    testFailed.value = true;
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => refresh({ clearMessages: true }));
</script>

<style scoped>
.notification-card {
  gap: 12px;
}

.notification-card__header {
  align-items: flex-start;
}

.notification-card__heading {
  min-width: 0;
}

.notification-card__description {
  margin: 0;
  color: var(--app-muted);
  font-size: 14px;
  line-height: 1.45;
}

.notification-status-badge {
  flex: 0 0 auto;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.notification-status-badge--active {
  border-color: color-mix(in srgb, var(--app-success) 42%, var(--app-border));
  background: color-mix(in srgb, var(--app-success) 14%, var(--app-surface));
  color: var(--app-success);
}

.notification-status-badge--inactive {
  background: var(--app-surface-soft);
  color: var(--app-muted);
}

.notification-status-badge--blocked {
  border-color: var(--app-danger-border);
  background: var(--app-danger-surface);
  color: var(--app-danger);
}

.notification-alert {
  margin: 0;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 9px 11px;
  font-size: 13px;
  line-height: 1.35;
}

.notification-alert--success {
  border-color: color-mix(in srgb, var(--app-success) 36%, var(--app-border));
  background: color-mix(in srgb, var(--app-success) 12%, var(--app-surface));
  color: var(--app-success);
}

.notification-alert--error {
  border-color: var(--app-danger-border);
  background: var(--app-danger-surface);
  color: var(--app-danger);
}

.notification-alert--info {
  border-color: color-mix(in srgb, var(--app-accent) 32%, var(--app-border));
  background: color-mix(in srgb, var(--app-accent) 10%, var(--app-surface));
  color: var(--app-accent-strong);
}

.notification-actions {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.notification-actions__primary {
  width: 100%;
}

.notification-actions__secondary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.notification-actions__secondary button {
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 9px 10px;
  font-size: 13px;
}

.notification-actions__danger {
  grid-column: 1 / -1;
  background: transparent;
}

.notification-actions__secondary button:disabled,
.notification-actions__primary:disabled {
  opacity: 0.58;
  filter: saturate(0.72);
}

@media (max-width: 430px) {
  .notification-card {
    gap: 10px;
  }

  .notification-card__header {
    gap: 8px;
  }
}
</style>
