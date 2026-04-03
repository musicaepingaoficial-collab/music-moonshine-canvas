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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already used trial
    const { data: existing } = await supabase
      .from("assinaturas")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan", "trial")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Teste grátis já utilizado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also check if user already has any active subscription
    const { data: activeSub } = await supabase
      .from("assinaturas")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (activeSub) {
      return new Response(JSON.stringify({ error: "Você já possui uma assinatura ativa" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabase.from("assinaturas").insert({
      user_id: user.id,
      plan: "trial",
      status: "active",
      price: 0,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("[CreateTrial:insertError]", insertError);
      return new Response(JSON.stringify({ error: "Erro ao criar teste grátis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[CreateTrial:success]", { userId: user.id, expiresAt: expiresAt.toISOString() });

    return new Response(JSON.stringify({ success: true, expires_at: expiresAt.toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CreateTrial:error]", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
