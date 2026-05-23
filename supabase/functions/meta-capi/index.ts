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
      .select("meta_enabled, meta_pixel_id, meta_events")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Token vive em tabela separada (admin-only)
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
    if (ud.fbp) userData.fbp = ud.fbp;
    if (ud.fbc) userData.fbc = ud.fbc;
    if (ud.client_ip_address) userData.client_ip_address = ud.client_ip_address;
    if (ud.client_user_agent) userData.client_user_agent = ud.client_user_agent;

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
    if (body.test_event_code) payload.test_event_code = body.test_event_code;

    const fbRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const fbJson = await fbRes.json();

    if (!fbRes.ok) {
      console.error("Meta CAPI error");
      return new Response(JSON.stringify({ error: "upstream error" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, response: fbJson }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("meta-capi error");
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
