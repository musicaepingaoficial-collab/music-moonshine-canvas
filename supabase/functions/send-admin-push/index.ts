// Envia Web Push para todos admins inscritos que tenham a preferência ligada.
// Body: { type: "purchase" | "pix_generated" | "purchase_rejected" | "purchase_refunded" | "test", title: string, body: string, url?: string, data?: any }

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

// Mapeia type -> coluna em admin_notification_prefs.
// `null` significa "sempre enviar, sem filtro de preferência" (ex.: test).
const PREF_BY_TYPE: Record<string, string | null> = {
  purchase: "notify_purchase",
  purchase_rejected: "notify_purchase",
  purchase_refunded: "notify_purchase",
  pix_generated: "notify_pix_generated",
  test: null,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let type = "unknown";
  let title = "";
  let logRow: Record<string, unknown> = {};

  try {
    const body = await req.json();
    type = body.type;
    title = body.title;
    const bodyText = body.body;
    const url = body.url;
    const data = body.data;

    if (!type || !title) {
      return new Response(JSON.stringify({ error: "type e title são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[send-admin-push] start", { type, title });

    // Buscar todos admins
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (rolesErr) throw rolesErr;

    const adminIds = (roles ?? []).map((r) => r.user_id);
    if (!adminIds.length) {
      logRow = { event_type: type, title, total_subs: 0, sent: 0, removed: 0, error: "no admins" };
      await supabase.from("admin_push_logs").insert(logRow);
      return new Response(JSON.stringify({ sent: 0, reason: "no admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filtrar por preferências (default true se ausente)
    const prefField = type in PREF_BY_TYPE ? PREF_BY_TYPE[type] : "notify_purchase";
    let allowedAdmins = adminIds;
    if (prefField) {
      const { data: prefs } = await supabase
        .from("admin_notification_prefs")
        .select(`user_id, ${prefField}`)
        .in("user_id", adminIds);

      const prefMap = new Map((prefs ?? []).map((p: any) => [p.user_id, p[prefField]]));
      allowedAdmins = adminIds.filter((id) => prefMap.get(id) !== false);
    }

    console.log("[send-admin-push] admins", {
      adminIds: adminIds.length,
      allowedAdmins: allowedAdmins.length,
    });

    if (!allowedAdmins.length) {
      logRow = { event_type: type, title, total_subs: 0, sent: 0, removed: 0, error: "no opted-in admins" };
      await supabase.from("admin_push_logs").insert(logRow);
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
      body: bodyText || "",
      url: url || "/admin",
      tag: type,
      data,
    });

    let sent = 0;
    let removed = 0;
    const toRemove: string[] = [];
    const errors: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            toRemove.push(s.id);
            removed++;
          } else {
            console.error("[send-admin-push] erro:", err?.statusCode, err?.body);
            errors.push(`${err?.statusCode}: ${err?.body || err?.message}`);
          }
        }
      })
    );

    if (toRemove.length) {
      await supabase.from("admin_push_subscriptions").delete().in("id", toRemove);
    }

    const total = subs?.length ?? 0;
    console.log("[send-admin-push] done", { sent, removed, total, errors: errors.length });

    await supabase.from("admin_push_logs").insert({
      event_type: type,
      title,
      total_subs: total,
      sent,
      removed,
      error: errors.length ? errors.join(" | ").slice(0, 1000) : null,
    });

    return new Response(JSON.stringify({ sent, removed, total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[send-admin-push] fatal:", e);
    try {
      await supabase.from("admin_push_logs").insert({
        event_type: type,
        title,
        sent: 0,
        removed: 0,
        error: String(e?.message || e).slice(0, 1000),
      });
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
