// MP → Kiwify webhook bridge
// Receives Mercado Pago webhook, fetches payment, translates to Kiwify-like
// payload and forwards to the configured destination URL (e.g. UTMfy).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

type BridgeConfig = {
  enabled: boolean;
  destination_url: string | null;
  product_id: string | null;
  product_name: string | null;
  secret_token: string | null;
  forward_pending: boolean;
  forward_refused: boolean;
};

function mapStatus(mpStatus: string): { kiwify: string; event: string } | null {
  switch (mpStatus) {
    case "approved":
      return { kiwify: "paid", event: "order_approved" };
    case "pending":
    case "in_process":
    case "authorized":
      return { kiwify: "waiting_payment", event: "pix_created" };
    case "rejected":
    case "cancelled":
      return { kiwify: "refused", event: "order_rejected" };
    case "refunded":
      return { kiwify: "refunded", event: "order_refunded" };
    case "charged_back":
      return { kiwify: "chargedback", event: "chargeback" };
    default:
      return null;
  }
}

async function hmacSha1Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildKiwifyPayload(args: {
  payment: any;
  config: BridgeConfig;
  status: { kiwify: string; event: string };
}) {
  const { payment, config, status } = args;
  const payer = payment.payer ?? {};
  const meta = payment.metadata ?? {};
  const additional = payment.additional_info ?? {};
  const items = additional.items ?? [];
  const amount = Number(payment.transaction_amount ?? 0).toFixed(2);

  let paymentMethod = "credit_card";
  if (payment.payment_type_id === "ticket") paymentMethod = "boleto";
  else if (payment.payment_method_id === "pix") paymentMethod = "pix";

  return {
    order_id: String(payment.id),
    order_ref: payment.external_reference ?? String(payment.id),
    order_status: status.kiwify,
    product_id: config.product_id ?? items[0]?.id ?? "default",
    product_name: config.product_name ?? items[0]?.title ?? "Assinatura",
    payment_method: paymentMethod,
    payment_merchant_id: payment.id,
    Customer: {
      full_name: `${payer.first_name ?? ""} ${payer.last_name ?? ""}`.trim() ||
        meta.customer_name || "",
      email: payer.email ?? meta.customer_email ?? "",
      mobile: payer.phone?.number ?? meta.customer_phone ?? "",
      CPF: payer.identification?.number ?? meta.customer_cpf ?? "",
      ip: meta.ip ?? "",
    },
    Commissions: {
      charge_amount: amount,
      product_base_price: amount,
      currency: payment.currency_id ?? "BRL",
    },
    TrackingParameters: {
      utm_source: meta.utm_source ?? null,
      utm_medium: meta.utm_medium ?? null,
      utm_campaign: meta.utm_campaign ?? null,
      utm_content: meta.utm_content ?? null,
      utm_term: meta.utm_term ?? null,
      src: meta.src ?? null,
      sck: meta.sck ?? null,
    },
    webhook_event_type: status.event,
    created_at: payment.date_created ?? new Date().toISOString(),
    approved_date: payment.date_approved ?? null,
  };
}

async function logEvent(row: {
  mp_payment_id?: string | null;
  mp_status?: string | null;
  kiwify_status?: string | null;
  destination_url?: string | null;
  request_payload?: unknown;
  response_status?: number | null;
  response_body?: string | null;
  success: boolean;
  error_message?: string | null;
}) {
  try {
    await supabase.from("kiwify_bridge_logs").insert(row);
  } catch (e) {
    console.error("failed to log bridge event", e);
  }
}

function buildTestPayment(): any {
  return {
    id: `TEST-${Date.now()}`,
    status: "approved",
    transaction_amount: 29.9,
    currency_id: "BRL",
    payment_type_id: "credit_card",
    payment_method_id: "visa",
    external_reference: "test-reference",
    date_created: new Date().toISOString(),
    date_approved: new Date().toISOString(),
    payer: {
      first_name: "Teste",
      last_name: "Bridge",
      email: "teste@bridge.local",
      identification: { number: "00000000000" },
      phone: { number: "11999999999" },
    },
    metadata: {
      utm_source: "teste",
      utm_medium: "manual",
      utm_campaign: "validacao-bridge",
    },
    additional_info: { items: [] },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const isTest = url.searchParams.get("test") === "1";

    // Load config
    const { data: cfg, error: cfgErr } = await supabase
      .from("kiwify_bridge_config")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (cfgErr) throw cfgErr;
    const config = cfg as BridgeConfig | null;

    if (!config) {
      return new Response(JSON.stringify({ ok: false, error: "no_config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isTest && !config.enabled) {
      return new Response(JSON.stringify({ ok: true, forwarded: false, reason: "disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.destination_url) {
      await logEvent({
        success: false,
        error_message: "destination_url not configured",
      });
      return new Response(JSON.stringify({ ok: false, error: "no_destination" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve payment
    let payment: any;
    if (isTest) {
      payment = buildTestPayment();
    } else {
      const body = await req.json().catch(() => ({} as any));
      const paymentId =
        body?.data?.id ?? body?.resource?.split("/").pop() ?? body?.id;
      if (!paymentId) {
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_TOKEN}` },
      });
      if (!resp.ok) {
        const text = await resp.text();
        await logEvent({
          mp_payment_id: String(paymentId),
          success: false,
          error_message: `MP fetch failed ${resp.status}: ${text.slice(0, 500)}`,
        });
        return new Response(JSON.stringify({ ok: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      payment = await resp.json();
    }

    const status = mapStatus(String(payment.status));
    if (!status) {
      await logEvent({
        mp_payment_id: String(payment.id),
        mp_status: payment.status,
        success: false,
        error_message: "unmapped status",
      });
      return new Response(JSON.stringify({ ok: true, forwarded: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (status.kiwify === "waiting_payment" && !config.forward_pending && !isTest) {
      return new Response(JSON.stringify({ ok: true, forwarded: false, reason: "pending_disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (status.kiwify === "refused" && !config.forward_refused && !isTest) {
      return new Response(JSON.stringify({ ok: true, forwarded: false, reason: "refused_disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = buildKiwifyPayload({ payment, config, status });
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.secret_token) {
      headers["x-kiwify-signature"] = await hmacSha1Hex(config.secret_token, body);
    }

    const fwd = await fetch(config.destination_url, {
      method: "POST",
      headers,
      body,
    });
    const respText = await fwd.text();

    await logEvent({
      mp_payment_id: String(payment.id),
      mp_status: String(payment.status),
      kiwify_status: status.kiwify,
      destination_url: config.destination_url,
      request_payload: payload,
      response_status: fwd.status,
      response_body: respText.slice(0, 2000),
      success: fwd.ok,
      error_message: fwd.ok ? null : `HTTP ${fwd.status}`,
    });

    return new Response(
      JSON.stringify({ ok: true, forwarded: true, kiwify_status: status.kiwify, response_status: fwd.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("bridge error", e);
    await logEvent({
      success: false,
      error_message: e?.message ?? String(e),
    });
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "unknown" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
