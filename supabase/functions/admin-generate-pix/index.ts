import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Verify Admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request
    const { target_user_id, plan_slug } = await req.json();

    if (!target_user_id || !plan_slug) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch target user and plan
    const [userRes, planRes] = await Promise.all([
      supabase.from("profiles").select("id, email, name, whatsapp, cpf").eq("id", target_user_id).single(),
      supabase.from("planos").select("*").eq("slug", plan_slug).single()
    ]);

    if (userRes.error || !userRes.data) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (planRes.error || !planRes.data) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUser = userRes.data;
    const plan = planRes.data;

    // 4. Mercado Pago PIX
    const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mpToken) {
      return new Response(JSON.stringify({ error: "MP configuration missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const price = Number(plan.price);
    const firstName = targetUser.name?.split(" ")[0] || "Cliente";
    const lastName = targetUser.name?.split(" ").slice(1).join(" ") || "Recovery";

    const payload = {
      transaction_amount: price,
      description: `Recuperação: ${plan.name} - MusicaePinga`,
      payment_method_id: "pix",
      payer: {
        email: targetUser.email,
        first_name: firstName,
        last_name: lastName,
        identification: targetUser.cpf ? { type: "CPF", number: targetUser.cpf.replace(/\D/g, "") } : undefined,
      },
      external_reference: `${targetUser.id}:${plan.slug}`,
      statement_descriptor: "MUSICAE PINGA",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      metadata: {
        admin_id: adminUser.id,
        recovery: "manual_whatsapp"
      }
    };

    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `admin-recovery-${targetUser.id}-${plan.slug}-${Date.now()}`
      },
      body: JSON.stringify(payload)
    });

    const mpData = await mpResp.json();

    if (!mpResp.ok) {
      console.error("MP Error:", mpData);
      return new Response(JSON.stringify({ error: mpData.message || "Mercado Pago error" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionData = mpData.point_of_interaction?.transaction_data || {};

    return new Response(JSON.stringify({
      id: mpData.id,
      status: mpData.status,
      qr_code: transactionData.qr_code,
      qr_code_base64: transactionData.qr_code_base64,
      ticket_url: transactionData.ticket_url,
      copy_paste: transactionData.qr_code
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
