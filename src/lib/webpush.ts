// Chave pública VAPID. É pública por design (não é secret).
export const VAPID_PUBLIC_KEY =
  "BCSzNXxsi33IT8i_lsaT5v-feQYpxGgv3rr-6bbjcmg_tcqpD5gw7ZdeiKg4gAlche5-zG94AkWoVAqJSR2b3gY";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return await reg.pushManager.getSubscription();
}

export async function subscribePush(): Promise<PushSubscription> {
  if (!isPushSupported()) throw new Error("Push não suportado neste navegador.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificações negada.");

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  }
  return sub;
}

export async function unsubscribePush(): Promise<boolean> {
  const sub = await getCurrentSubscription();
  if (!sub) return true;
  return await sub.unsubscribe();
}

export function subscriptionToRow(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint!,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
}
