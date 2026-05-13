import { httpClient } from '@/api/httpClient';

interface VapidPublicKeyResponse {
  publicKey: string;
}

interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

interface PushTestRequest {
  title?: string;
  body?: string;
  url?: string;
}

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
};

export const getExistingSubscription = async () => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

export const subscribeToPushNotifications = async () => {
  if (!isPushSupported()) {
    throw new Error('Notifiche push non supportate su questo dispositivo.');
  }
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'Notifiche bloccate dal browser.' : 'Permesso notifiche non concesso.');
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(await getVapidPublicKey()),
    }));
  await sendSubscriptionToBackend(subscription);
  return subscription;
};

export const unsubscribeFromPushNotifications = async () => {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  await deleteSubscriptionFromBackend(subscription.endpoint);
  await subscription.unsubscribe();
};

export const sendSubscriptionToBackend = async (subscription: PushSubscription) => {
  const payload = subscription.toJSON() as PushSubscriptionJSON;
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth) {
    throw new Error('Subscription push non valida.');
  }
  await httpClient.post('/push/subscriptions', {
    endpoint: payload.endpoint,
    keys: {
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
    },
    userAgent: navigator.userAgent,
  } satisfies PushSubscriptionRequest);
};

export const deleteSubscriptionFromBackend = async (endpoint: string) => {
  await httpClient.delete('/push/subscriptions', { data: { endpoint } });
};

export const sendTestNotification = async (payload: PushTestRequest = {}) => {
  await httpClient.post('/push/test', payload);
};

const getVapidPublicKey = async () => {
  const { data } = await httpClient.get<VapidPublicKeyResponse>('/push/vapid-public-key');
  if (!data.publicKey) {
    throw new Error('Chiave VAPID pubblica non configurata sul backend.');
  }
  return data.publicKey;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};
