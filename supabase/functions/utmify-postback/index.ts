import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

interface UtmifyOrderPayload {
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  cpf?: string;
  order_id: string;
  total_price: number;
  product_name: string;
  status: "approved" | "pending" | "rejected" | "refunded";
  payment_method?: string;
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const payload = (await req.json()) as UtmifyOrderPayload;
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("pixel_settings")
      .select("utmify_enabled")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings?.utmify_enabled) {
      return new Response(JSON.stringify({ skipped: "utmify disabled" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: secrets } = await supabase
      .from("pixel_settings_secrets")
      .select("utmify_token")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const token = secrets?.utmify_token;
    if (!token) {
      return new Response(JSON.stringify({ error: "utmify token missing" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    console.log(`[utmify] Sending order ${payload.order_id} status ${payload.status}`);

    const res = await fetch("https://api.utmify.com.br/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[utmify] API error", res.status, result);
      return new Response(JSON.stringify({ error: "utmify api error", details: result }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[utmify] error", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});