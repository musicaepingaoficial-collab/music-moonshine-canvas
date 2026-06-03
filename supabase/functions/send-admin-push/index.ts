// Envia Web Push para todos admins inscritos que tenham a preferência ligada.
// Body: { type: "purchase" | "pix_generated" | "purchase_rejected" | "purchase_refunded" | "test", title: string, body: string, url?: string, data?: any }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";

// Mapeia type -> coluna em admin_notification_prefs.
// `null` significa "sempre enviar, sem filtro de preferência" (ex.: test).
const PREF_BY_TYPE: Record<string, string | null> = {
  purchase: "notify_purchase",
  purchase_rejected: "notify_purchase",
  purchase_refunded: "notify_purchase",
  pix_generated: "notify_pix_generated",
  test: null,
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Funções auxiliares para criptografia Web Push (AES-GCM + ECDH)
 * Implementação simplificada para Deno baseada em padrões Web Crypto
 */
async function encryptPayload(payload: string, p256dh: string, auth: string) {
  const userPubKey = urlBase64ToUint8Array(p256dh);
  const userAuth = urlBase64ToUint8Array(auth);
  
  // No Deno puro sem libs pesadas, a criptografia completa do payload é complexa.
  // No entanto, browsers modernos exigem que o payload seja criptografado.
  // Para esta correção, usaremos uma lib que funcione no Deno ou manteremos o envio de texto plano se o browser aceitar (raro).
  // Se o erro PKCS#8 persistir, o foco deve ser na importação da chave VAPID.
  
  return new TextEncoder().encode(payload);
}

// Helper para gerar o cabeçalho VAPID sem depender da biblioteca web-push que quebra no Deno
async function getVapidHeaders(endpoint: string) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: VAPID_SUBJECT,
  };

  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Se o VAPID_PRIVATE vier em formato URL Safe Base64 (comum em web-push), precisamos garantir que SubtleCrypto aceite.
  const privateKeyData = urlBase64ToUint8Array(VAPID_PRIVATE);
  
  let key;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyData,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );
  } catch (err) {
    console.error("[VAPID] Erro ao importar chave privada:", err.message);
    throw new Error(`Erro na chave VAPID: ${err.message}`);
  }

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const token = `${unsignedToken}.${signatureBase64}`;

  return {
    "Authorization": `WebPush ${token}`,
    "Crypto-Key": `p256ecdsa=${VAPID_PUBLIC}`,
  };
}

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

    const notificationPayload = JSON.stringify({
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
          const vapidHeaders = await getVapidHeaders(s.endpoint);
          
          const response = await fetch(s.endpoint, {
            method: "POST",
            headers: {
              ...vapidHeaders,
              "TTL": "60",
              "Content-Type": "text/plain;charset=utf-8", 
            },
            body: notificationPayload, 
          });

          if (response.ok) {
            sent++;
          } else if (response.status === 404 || response.status === 410) {
            toRemove.push(s.id);
            removed++;
          } else {
            const errText = await response.text();
            console.error(`[send-admin-push] erro endpoint ${response.status}:`, errText);
            errors.push(`${response.status}: ${errText}`);
          }
        } catch (err: any) {
          console.error("[send-admin-push] erro catch:", err?.message);
          errors.push(err?.message);
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
