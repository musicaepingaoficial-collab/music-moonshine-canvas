// Envia Web Push para todos admins inscritos que tenham a preferência ligada.
// Body: { type: "purchase" | "pix_generated", title: string, body: string, url?: string, data?: any }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const PREF_BY_TYPE: Record<string, string> = {
  purchase: "notify_purchase",
  pix_generated: "notify_pix_generated",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, title, body, url, data } = await req.json();
    if (!type || !title) {
      return new Response(JSON.stringify({ error: "type e title são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar todos admins
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (rolesErr) throw rolesErr;

    const adminIds = (roles ?? []).map((r) => r.user_id);
    if (!adminIds.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filtrar por preferências
    const prefField = PREF_BY_TYPE[type];
    let allowedAdmins = adminIds;
    if (prefField) {
      const { data: prefs } = await supabase
        .from("admin_notification_prefs")
        .select(`user_id, ${prefField}`)
        .in("user_id", adminIds);

      const prefMap = new Map((prefs ?? []).map((p: any) => [p.user_id, p[prefField]]));
      allowedAdmins = adminIds.filter((id) => prefMap.get(id) !== false); // default true
    }

    if (!allowedAdmins.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no opted-in admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar inscrições
    const { data: subs, error: subsErr } = await supabase
      .from("admin_push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", allowedAdmins);
    if (subsErr) throw subsErr;

    const payload = JSON.stringify({
      title,
      body: body || "",
      url: url || "/admin",
      tag: type,
      data,
    });

    let sent = 0;
    let removed = 0;
    const toRemove: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          // 404/410 = inscrição expirada, remover
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            toRemove.push(s.id);
            removed++;
          } else {
            console.error("[send-admin-push] erro:", err?.statusCode, err?.body);
          }
        }
      })
    );

    if (toRemove.length) {
      await supabase.from("admin_push_subscriptions").delete().in("id", toRemove);
    }

    return new Response(JSON.stringify({ sent, removed, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[send-admin-push] fatal:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
