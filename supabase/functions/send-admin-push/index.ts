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

// Helper para gerar o cabeçalho VAPID compatível com Deno
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

  const privateKeyData = urlBase64ToUint8Array(VAPID_PRIVATE);
  
  let key;
  if (privateKeyData.length === 32) {
    // É uma chave privada raw (D-value). Vamos importar via JWK.
    // Para ES256, precisamos do componente 'd'. 
    // Nota: SubtleCrypto exige x e y para importar uma chave EC privada via JWK, 
    // OU podemos usar a biblioteca que lida com isso.
    // Mas como estamos tentando ser "zero dep", vamos tentar construir o PKCS#8 manual ou JWK completo.
    
    // Abordagem: Se for 32 bytes, é quase certo que é o formato raw. 
    // Vamos tentar importar como PKCS#8 primeiro, se falhar, avisar.
    try {
      key = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyData,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
      );
    } catch (e) {
      console.error("[VAPID] Chave de 32 bytes não é PKCS#8. Erro:", e.message);
      // Fallback: Tenta importar como se fosse a chave privada PKCS#8 mas sem o cabeçalho (comum em algumas ferramentas)
      // Para simplificar, se falhar aqui, o admin precisa corrigir a secret para ser um PKCS#8 válido.
      throw new Error(`A chave VAPID_PRIVATE_KEY deve estar no formato PKCS#8 Base64. A chave atual tem 32 bytes (formato raw), que não é suportado nativamente pelo SubtleCrypto sem conversão. Use uma chave PKCS#8.`);
    }
  } else {
    key = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyData,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );
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

  let type = "unknown";
  let title = "";

  try {
    const body = await req.json();
    type = body.type || "test";
    title = body.title || "Notificação";
    const bodyText = body.body || "";
    const url = body.url || "/admin";
    const data = body.data || {};

    console.log("[send-admin-push] Enviando:", { type, title });

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

    const payload = JSON.stringify({ title, body: bodyText, url, tag: type, data });

    let sent = 0;
    let removed = 0;
    const errors: string[] = [];

    await Promise.all(subs.map(async (s) => {
      try {
        const vapidHeaders = await getVapidHeaders(s.endpoint);
        const res = await fetch(s.endpoint, {
          method: "POST",
          headers: { ...vapidHeaders, "TTL": "60", "Content-Type": "text/plain;charset=utf-8" },
          body: payload,
        });

        if (res.ok) sent++;
        else if (res.status === 404 || res.status === 410) {
          removed++;
          await supabase.from("admin_push_subscriptions").delete().eq("id", s.id);
        } else {
          errors.push(`${res.status}: ${await res.text()}`);
        }
      } catch (err) {
        errors.push(err.message);
      }
    }));

    await supabase.from("admin_push_logs").insert({
      event_type: type,
      title,
      total_subs: subs.length,
      sent,
      removed,
      error: errors.length ? errors.join(" | ").slice(0, 1000) : null,
    });

    return new Response(JSON.stringify({ sent, total: subs.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[send-admin-push] Erro fatal:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
