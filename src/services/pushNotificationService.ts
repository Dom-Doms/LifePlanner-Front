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

export type PushNotificationStatus =
  | 'unsupported'
  | 'permissionDefault'
  | 'permissionDenied'
  | 'permissionGrantedNoSubscription'
  | 'active'
  | 'backendError';

interface PushStatusResult {
  status: PushNotificationStatus;
  permission: NotificationPermission | 'unsupported';
  subscription: PushSubscription | null;
  backendSynced: boolean;
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
  debugPush('waiting for serviceWorker.ready');
  const registration = await navigator.serviceWorker.ready;
  debugPush('serviceWorker ready', { scope: registration.scope });
  const subscription = await registration.pushManager.getSubscription();
  debugPush('existing subscription', {
    hasSubscription: Boolean(subscription),
    endpoint: subscription?.endpoint,
  });
  return subscription;
};

export const refreshPushStatus = async (): Promise<PushStatusResult> => {
  if (!isPushSupported()) {
    debugPush('status unsupported');
    return { status: 'unsupported', permission: 'unsupported', subscription: null, backendSynced: false };
  }

  const permission = getNotificationPermission();
  debugPush('permission', { permission });

  if (permission === 'denied') {
    return { status: 'permissionDenied', permission, subscription: null, backendSynced: false };
  }

  if (permission === 'default') {
    return { status: 'permissionDefault', permission, subscription: null, backendSynced: false };
  }

  const subscription = await getExistingSubscription();
  if (!subscription) {
    return { status: 'permissionGrantedNoSubscription', permission, subscription: null, backendSynced: false };
  }

  try {
    await sendSubscriptionToBackend(subscription);
    debugPush('backend save success', { endpoint: subscription.endpoint });
    return { status: 'active', permission, subscription, backendSynced: true };
  } catch (error) {
    debugPush('backend save fail', { endpoint: subscription.endpoint, error });
    return { status: 'backendError', permission, subscription, backendSynced: false };
  }
};

export const subscribeToPushNotifications = async () => {
  if (!isPushSupported()) {
    throw new Error('Notifiche push non supportate su questo dispositivo.');
  }
  const publicKey = await getVapidPublicKey();
  const permission = await requestNotificationPermission();
  debugPush('permission after request', { permission });
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'Notifiche bloccate dal browser.' : 'Permesso notifiche non concesso.');
  }
  debugPush('waiting for serviceWorker.ready');
  const registration = await navigator.serviceWorker.ready;
  debugPush('serviceWorker ready', { scope: registration.scope });
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));
  await sendSubscriptionToBackend(subscription);
  debugPush('backend save success', { endpoint: subscription.endpoint });
  const currentSubscription = await registration.pushManager.getSubscription();
  if (!currentSubscription) {
    throw new Error('Subscription push non trovata dopo attivazione.');
  }
  return currentSubscription;
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

export const getVapidPublicKey = async () => {
  const { data } = await httpClient.get<VapidPublicKeyResponse>('/push/vapid-public-key');
  if (!data.publicKey) {
    throw new Error('Le notifiche push non sono ancora configurate sul server.');
  }
  return data.publicKey;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const debugPush = (message: string, data?: unknown) => {
  if (!import.meta.env.DEV) return;
  if (data === undefined) {
    console.debug(`[push] ${message}`);
    return;
  }
  console.debug(`[push] ${message}`, data);
};
