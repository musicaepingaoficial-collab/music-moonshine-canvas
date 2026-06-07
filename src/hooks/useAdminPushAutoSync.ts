import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useUser";
import {
  isPushSupported,
  getCurrentSubscription,
  subscribePush,
  subscriptionToRow,
} from "@/lib/webpush";

const SESSION_FLAG = "admin-push-autosync-done";

/**
 * Quando um admin abre o app e já concedeu permissão de notificação,
 * garante que (1) existe um PushSubscription no browser e (2) ele está
 * registrado em admin_push_subscriptions. Cobre o caso em que iOS/Android
 * invalida a inscrição silenciosamente e deixa o admin sem notificações
 * em background.
 */
export function useAdminPushAutoSync() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);

  useEffect(() => {
    if (!user || !isAdmin) return;
    if (!isPushSupported()) return;
    if (Notification.permission !== "granted") return;
    if (sessionStorage.getItem(SESSION_FLAG)) return;

    let cancelled = false;

    (async () => {
      try {
        // Garante que o SW está pronto antes de mexer em pushManager
        await navigator.serviceWorker.ready;

        let sub = await getCurrentSubscription();

        // Browser não tem mais a inscrição → reinscreve sem prompt
        if (!sub) {
          try {
            sub = await subscribePush();
          } catch (err) {
            console.warn("[push-autosync] reinscrição falhou:", err);
            return;
          }
        }

        if (cancelled || !sub) return;

        const row = subscriptionToRow(sub);
        const { error } = await (supabase.from("admin_push_subscriptions" as any) as any).upsert(
          { user_id: user.id, ...row, last_used_at: new Date().toISOString() },
          { onConflict: "endpoint" }
        );
        if (error) {
          console.warn("[push-autosync] upsert falhou:", error);
          return;
        }

        sessionStorage.setItem(SESSION_FLAG, "1");
      } catch (err) {
        console.warn("[push-autosync] erro:", err);
      }
    })();

    // Escuta atualizações de subscription enviadas pelo service worker
    // (evento pushsubscriptionchange) e sincroniza com o banco em tempo real.
    const onMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== "push-subscription-changed") return;
      try {
        const json = data.subscription;
        const endpoint = json?.endpoint;
        if (!endpoint) return;
        await (supabase.from("admin_push_subscriptions" as any) as any).upsert(
          {
            user_id: user.id,
            endpoint,
            p256dh: json?.keys?.p256dh ?? "",
            auth: json?.keys?.auth ?? "",
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            last_used_at: new Date().toISOString(),
          },
          { onConflict: "endpoint" }
        );
      } catch (err) {
        console.warn("[push-autosync] sw message upsert falhou:", err);
      }
    };

    if (isPushSupported()) {
      navigator.serviceWorker.addEventListener("message", onMessage);
    }

    return () => {
      cancelled = true;
      if (isPushSupported()) {
        navigator.serviceWorker.removeEventListener("message", onMessage);
      }
    };
  }, [user, isAdmin]);
}

