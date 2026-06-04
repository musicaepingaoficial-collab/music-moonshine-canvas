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
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@repertoriomusicaepinga.com.br";

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

function uint8ArrayToUrlBase64(array: Uint8Array) {
  return btoa(String.fromCharCode(...array))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Helper para gerar o cabeçalho VAPID compatível com Deno (Web Crypto API)
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

  const encode = (obj: any) => uint8ArrayToUrlBase64(new TextEncoder().encode(JSON.stringify(obj)));
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  const privateKeyData = urlBase64ToUint8Array(VAPID_PRIVATE);
  const publicKeyData = urlBase64ToUint8Array(VAPID_PUBLIC);
  
  let key;
  try {
    // Tenta primeiro PKCS#8 (formato padrão esperado)
    key = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyData,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );
  } catch (err) {
    // Se falhar e tiver 32 bytes, tenta construir um JWK usando a chave pública para X e Y
    if (privateKeyData.length === 32 && publicKeyData.length >= 65) {
      // publicKeyData format: [0x04, X (32 bytes), Y (32 bytes)]
      const x = publicKeyData.slice(1, 33);
      const y = publicKeyData.slice(33, 65);
      
      const jwk = {
        kty: "EC",
        crv: "P-256",
        x: uint8ArrayToUrlBase64(x),
        y: uint8ArrayToUrlBase64(y),
        d: uint8ArrayToUrlBase64(privateKeyData),
        ext: true,
      };
      
      key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
      );
    } else {
      throw err;
    }
  }

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBase64 = uint8ArrayToUrlBase64(new Uint8Array(signature));

  return {
    "Authorization": `WebPush ${unsignedToken}.${signatureBase64}`,
    "Crypto-Key": `p256ecdsa=${VAPID_PUBLIC}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const type = body.type || "test";
    const title = body.title || "Notificação";
    const bodyText = body.body || "";
    const url = body.url || "/admin";
    const data = body.data || {};

    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (roles ?? []).map((r) => r.user_id);

    if (!adminIds.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no admins" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prefField = type in PREF_BY_TYPE ? PREF_BY_TYPE[type] : "notify_purchase";
    let allowedAdmins = adminIds;
    if (prefField) {
      const { data: prefs } = await supabase.from("admin_notification_prefs").select(`user_id, ${prefField}`).in("user_id", adminIds);
      const prefMap = new Map((prefs ?? []).map((p: any) => [p.user_id, p[prefField]]));
      allowedAdmins = adminIds.filter((id) => prefMap.get(id) !== false);
    }

    const { data: subs } = await supabase.from("admin_push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", allowedAdmins);
    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subs" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Deduplicate by (event_type, mp_payment_id) — protected at the DB level by a unique partial index.
    // If a duplicate webhook fires (MP retries), skip the push and the log insert.
    const mpId = data?.mp_payment_id ? String(data.mp_payment_id) : null;
    if (mpId) {
      const { data: existing } = await supabase
        .from("admin_push_logs")
        .select("id")
        .eq("event_type", type)
        .filter("data->>mp_payment_id", "eq", mpId)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "duplicate mp_payment_id", id: existing.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const notificationPayload = JSON.stringify({ title, body: bodyText, url, tag: type, data });

    let sent = 0;
    let removed = 0;
    const errors: string[] = [];

    // Processamos em série para evitar problemas de concorrência ou limites de rate
    for (const s of subs) {
      try {
        const vapidHeaders = await getVapidHeaders(s.endpoint);
        const res = await fetch(s.endpoint, {
          method: "POST",
          headers: { ...vapidHeaders, "TTL": "60", "Content-Type": "text/plain;charset=utf-8" },
          body: notificationPayload,
        });

        if (res.ok) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          removed++;
          await supabase.from("admin_push_subscriptions").delete().eq("id", s.id);
        } else {
          errors.push(`${res.status}: ${await res.text()}`);
        }
      } catch (err) {
        errors.push(err.message);
      }
    }

    const { error: logErr } = await supabase.from("admin_push_logs").insert({
      event_type: type,
      title,
      body: bodyText,
      url,
      data,
      total_subs: subs.length,
      sent,
      removed,
      error: errors.length ? errors.join(" | ").slice(0, 1000) : null,
    });
    // Duplicate-key (23505) means a concurrent call already logged this payment — safe to ignore.
    if (logErr && (logErr as any).code !== "23505") {
      console.error("[admin_push_logs insert]", logErr);
    }

    return new Response(JSON.stringify({ sent, total: subs.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
