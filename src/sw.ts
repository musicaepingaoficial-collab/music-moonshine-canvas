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

// Ativa o novo SW imediatamente, sem esperar todas as abas fecharem
self.addEventListener("install", () => {
  self.skipWaiting();
});

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

  const title = payload.title || "Repertório • Notificação";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: payload.icon || "/pwa-icon-192.png",
    badge: payload.badge || "/pwa-icon-192.png",
    tag: payload.tag,
    data: { url: payload.url || "/admin/notificacoes", ...(payload.data || {}) },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) || "/admin/notificacoes";

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

// ── Push subscription rotation/expiration ──
// Quando o browser/SO invalida a inscrição (comum em PWA iOS/Android após
// inatividade), tenta reinscrever e notifica abas abertas para fazer o upsert
// em admin_push_subscriptions. Se nenhuma aba estiver aberta, a próxima
// abertura do app dispara o auto-sync e sincroniza.
self.addEventListener("pushsubscriptionchange", (event: any) => {
  event.waitUntil(
    (async () => {
      try {
        const oldKey =
          event.oldSubscription?.options?.applicationServerKey ||
          event.newSubscription?.options?.applicationServerKey;
        const newSub =
          event.newSubscription ||
          (oldKey
            ? await self.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: oldKey,
              })
            : null);
        if (!newSub) return;
        const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of clientsList) {
          c.postMessage({ type: "push-subscription-changed", subscription: newSub.toJSON() });
        }
      } catch (err) {
        console.warn("[sw] pushsubscriptionchange falhou:", err);
      }
    })()
  );
});
