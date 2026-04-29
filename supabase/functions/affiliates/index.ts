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

    const { action } = await req.json();

    if (action === "generate-link") {
      // Check if already has affiliate link
      const { data: existing } = await supabase
        .from("afiliados")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ code: existing.code, affiliate: existing }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate unique code
      const code = `SD-${user.id.substring(0, 8).toUpperCase()}`;

      const { data: affiliate, error: insertError } = await supabase
        .from("afiliados")
        .insert({ user_id: user.id, code, commission_percent: 10 })
        .select()
        .single();

      if (insertError) {
        console.error("Affiliate insert error:", insertError);
        return new Response(JSON.stringify({ error: "Erro ao gerar link" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ code, affiliate }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "register-referral") {
      const { referralCode } = await req.json();

      // Find affiliate by code
      const { data: affiliate } = await supabase
        .from("afiliados")
        .select("*")
        .eq("code", referralCode)
        .maybeSingle();

      if (!affiliate) {
        return new Response(JSON.stringify({ error: "Código inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Block self-referral
      if (affiliate.user_id === user.id) {
        return new Response(JSON.stringify({ error: "Auto indicação não permitida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already referred
      const { data: existingRef } = await supabase
        .from("indicacoes")
        .select("id")
        .eq("referred_user_id", user.id)
        .maybeSingle();

      if (existingRef) {
        return new Response(JSON.stringify({ error: "Já indicado anteriormente" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sem limite de indicações registradas — recompensas até 10x são tratadas no webhook

      const { error: refError } = await supabase.from("indicacoes").insert({
        afiliado_id: affiliate.id,
        referred_user_id: user.id,
        status: "pending",
      });

      if (refError) {
        console.error("Referral insert error:", refError);
        return new Response(JSON.stringify({ error: "Erro ao registrar indicação" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Affiliates error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
