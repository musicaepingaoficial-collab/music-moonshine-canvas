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
    const { pending_id, claim_token, password } = await req.json();

    if (!password || String(password).length < 6) {
      return new Response(JSON.stringify({ error: "Senha precisa ter ao menos 6 caracteres." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase.from("pending_subscriptions").select("*");
    if (pending_id) query = query.eq("id", pending_id);
    else if (claim_token) query = query.eq("claim_token", claim_token);
    else {
      return new Response(JSON.stringify({ error: "Identificador ausente." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pending, error: findErr } = await query.maybeSingle();

    if (findErr || !pending) {
      return new Response(JSON.stringify({ error: "Pagamento não encontrado." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pending.status === "claimed") {
      return new Response(JSON.stringify({ error: "Este pagamento já foi finalizado. Faça login.", code: "already_claimed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pending.status !== "approved") {
      return new Response(JSON.stringify({
        error: "Pagamento ainda não confirmado.",
        code: "not_approved",
        status: pending.status,
      }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = String(pending.email).trim().toLowerCase();

    // Cria usuário (e-mail confirmado para não exigir verificação)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        name: pending.full_name,
        full_name: pending.full_name,
        whatsapp: pending.whatsapp,
        cpf: pending.cpf,
      },
    });

    if (createErr || !created.user) {
      // Se já existe (corrida), retorna erro orientando login
      const msg = (createErr?.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        return new Response(JSON.stringify({ error: "E-mail já cadastrado. Faça login.", code: "email_exists" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("createUser err:", createErr);
      return new Response(JSON.stringify({ error: "Falha ao criar conta." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user.id;

    // Buscar plano para calcular expiração
    const { data: planRow } = await supabase
      .from("planos")
      .select("price, duration_days, slug")
      .eq("slug", pending.plan)
      .single();

    const durationDays = planRow?.duration_days;
    const expiresAt = durationDays === null || durationDays === undefined
      ? null
      : new Date(Date.now() + durationDays * 86400000).toISOString();

    // Encerrar quaisquer assinaturas anteriores (improvável neste fluxo)
    await supabase
      .from("assinaturas")
      .update({ status: "inactive" })
      .eq("user_id", userId)
      .eq("status", "active");

    const { error: insertErr } = await supabase.from("assinaturas").insert({
      user_id: userId,
      plan: pending.plan,
      status: "active",
      price: Number(pending.price || planRow?.price || 0),
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("insert assinatura err:", insertErr);
      return new Response(JSON.stringify({ error: "Conta criada, mas falha ao ativar plano. Contate o suporte." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("pending_subscriptions")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
        claimed_user_id: userId,
      })
      .eq("id", pending.id);

    return new Response(JSON.stringify({ success: true, email, user_id: userId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("claim error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
