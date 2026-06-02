/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// HTML navigations: NetworkFirst puro, SEM fallback para index.html precacheado.
// Servir o HTML antigo após um deploy faz o browser pedir chunks com hashes
// que não existem mais → tela em branco / spinner infinito.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "html",
      networkTimeoutSeconds: 3,
    }),
    {
      denylist: [
        /^\/~oauth/,
        /^\/api\//,
        // Não interceptar pedidos diretos a assets com hash (já têm cache eterno do Vite)
        /\.[a-f0-9]{8,}\.(js|css|mjs)$/,
      ],
    }
  )
);

// O cliente decide quando ativar o novo SW (botão "Atualizar agora")
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push notifications ──
self.addEventListener("push", (event: PushEvent) => {
  let payload: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
    data?: any;
  } = {};

  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Notificação", body: event.data?.text() || "" };
  }

  const title = payload.title || "Nova notificação";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: payload.icon || "/pwa-icon-192.png",
    badge: payload.badge || "/pwa-icon-192.png",
    tag: payload.tag,
    data: { url: payload.url || "/admin", ...(payload.data || {}) },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) || "/admin";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = all.find((c) => c.url.includes(url));
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});
