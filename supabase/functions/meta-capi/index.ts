import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || undefined;
}

interface CapiBody {
  event_name: string;
  event_id?: string;
  event_source_url?: string;
  action_source?: string;
  user_data?: {
    email?: string;
    phone?: string;
    fbp?: string;
    fbc?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    external_id?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    date_of_birth?: string;
  };
  custom_data?: Record<string, unknown>;
  test_event_code?: string;
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const body = (await req.json()) as CapiBody;
    if (!body?.event_name) {
      return new Response(JSON.stringify({ error: "event_name required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("pixel_settings")
      .select("meta_enabled, meta_pixel_id, meta_events, meta_test_event_code")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: secrets } = await supabase
      .from("pixel_settings_secrets")
      .select("meta_access_token")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const metaToken = secrets?.meta_access_token;

    if (!settings?.meta_enabled || !settings.meta_pixel_id || !metaToken) {
      return new Response(JSON.stringify({ skipped: "meta capi not configured" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const toggleMap: Record<string, string> = {
      PageView: "page_view",
      ViewContent: "view_content",
      AddToCart: "add_to_cart",
      InitiateCheckout: "initiate_checkout",
      AddPaymentInfo: "add_payment_info",
      Purchase: "purchase",
      Lead: "lead",
      CompleteRegistration: "complete_registration",
    };
    const toggleKey = toggleMap[body.event_name];
    const events = (settings.meta_events || {}) as Record<string, boolean>;
    if (toggleKey && events[toggleKey] === false) {
      return new Response(JSON.stringify({ skipped: "event disabled" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const ud = body.user_data || {};
    const userData: Record<string, unknown> = {};
    if (ud.email) userData.em = [await sha256(ud.email)];
    if (ud.phone) userData.ph = [await sha256(ud.phone.replace(/\D/g, ""))];
    if (ud.external_id) userData.external_id = [await sha256(ud.external_id)];
    if (ud.first_name) userData.fn = [await sha256(ud.first_name)];
    if (ud.last_name) userData.ln = [await sha256(ud.last_name)];
    if (ud.city) userData.ct = [await sha256(ud.city.replace(/\s+/g, ""))];
    if (ud.state) userData.st = [await sha256(ud.state.replace(/\s+/g, ""))];
    if (ud.zip) userData.zp = [await sha256(ud.zip.replace(/\D/g, ""))];
    if (ud.country) userData.country = [await sha256(ud.country)];
    if (ud.date_of_birth) userData.db = [await sha256(ud.date_of_birth.replace(/\D/g, ""))];
    if (ud.fbp) userData.fbp = ud.fbp;
    if (ud.fbc) userData.fbc = ud.fbc;

    // Prefer IP/UA extracted from the incoming request headers
    const ip = ud.client_ip_address || clientIp(req);
    const ua = ud.client_user_agent || req.headers.get("user-agent") || undefined;
    if (ip) userData.client_ip_address = ip;
    if (ua) userData.client_user_agent = ua;

    const event = {
      event_name: body.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.event_id,
      event_source_url: body.event_source_url,
      action_source: body.action_source || "website",
      user_data: userData,
      custom_data: body.custom_data || {},
    };

    const url = `https://graph.facebook.com/v18.0/${settings.meta_pixel_id}/events?access_token=${metaToken}`;
    const payload: Record<string, unknown> = { data: [event] };
    const testCode = body.test_event_code || settings.meta_test_event_code || undefined;
    if (testCode) payload.test_event_code = testCode;

    const fbRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const fbJson = await fbRes.json().catch(() => ({}));

    // Audit log (fire-and-forget; failures don't affect the response)
    supabase
      .from("meta_capi_logs")
      .insert({
        event_name: body.event_name,
        event_id: body.event_id ?? null,
        status_code: fbRes.status,
        fbtrace_id: (fbJson as any)?.fbtrace_id ?? null,
        events_received: (fbJson as any)?.events_received ?? null,
        response: fbJson,
        error: fbRes.ok ? null : ((fbJson as any)?.error?.message ?? "upstream error"),
      })
      .then(() => {}, () => {});

    if (!fbRes.ok) {
      console.error("Meta CAPI error", fbRes.status, JSON.stringify(fbJson));
      return new Response(JSON.stringify({ error: "upstream error", details: fbJson }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, response: fbJson }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("meta-capi error", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
