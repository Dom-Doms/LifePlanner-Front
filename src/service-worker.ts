/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import type { PrecacheEntry } from 'workbox-precaching';
import { createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute((self as ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<string | PrecacheEntry> }).__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: {
    url?: string;
  };
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event);
  const targetUrl = payload.data?.url ?? payload.url ?? '/day';
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'LifePlanner', {
      body: payload.body ?? '',
      icon: payload.icon ?? '/pwa-192x192.png',
      badge: payload.badge ?? '/pwa-192x192.png',
      tag: payload.tag,
      data: { url: targetUrl },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? '/day', self.location.origin).href;
  event.waitUntil(openOrFocus(url));
});

const readPayload = (event: PushEvent): PushPayload => {
  if (!event.data) return {};
  try {
    return event.data.json() as PushPayload;
  } catch {
    return { title: 'LifePlanner', body: event.data.text() };
  }
};

const openOrFocus = async (url: string) => {
  const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const exactClient = windowClients.find((client) => client.url === url);
  if (exactClient) {
    await exactClient.focus();
    return;
  }
  const sameOriginClient = windowClients.find((client) => new URL(client.url).origin === self.location.origin);
  if (sameOriginClient && 'navigate' in sameOriginClient) {
    await sameOriginClient.navigate(url);
    await sameOriginClient.focus();
    return;
  }
  await self.clients.openWindow(url);
};
