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

    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    if (topic !== "payment") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = url.searchParams.get("id") || url.searchParams.get("data.id");
    if (!paymentId) {
      console.error("Webhook payment without id");
      return new Response(JSON.stringify({ error: "paymentId ausente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mercadoPagoAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mercadoPagoAccessToken) {
      return new Response("MP not configured", { status: 500 });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mercadoPagoAccessToken}` },
    });

    const payment: any = await mpResponse.json();
    if (!mpResponse.ok) {
      console.error("Error fetching payment from Mercado Pago:", payment);
      return new Response(JSON.stringify({ error: "Falha ao consultar pagamento" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "approved") {
      const [userId, planSlug] = String(payment.external_reference || "").split(":");
      if (!userId || !planSlug) {
        console.error("Invalid external_reference:", payment.external_reference);
        return new Response("Invalid reference", { status: 400 });
      }

      const { data: plan } = await supabase
        .from("planos")
        .select("price, duration_days, slug")
        .eq("slug", planSlug)
        .single();

      if (!plan) {
        console.error("Plan not found for slug:", planSlug);
        return new Response("Plan not found", { status: 400 });
      }

      const durationDays = plan.duration_days;
      const expiresAt = durationDays === null || durationDays === undefined
        ? new Date("2099-12-31T23:59:59Z")
        : new Date(Date.now() + durationDays * 86400000);

      await supabase
        .from("assinaturas")
        .update({ status: "inactive" })
        .eq("user_id", userId)
        .eq("status", "active");

      const { error: insertError } = await supabase.from("assinaturas").insert({
        user_id: userId,
        plan: planSlug,
        status: "active",
        price: Number(plan.price),
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        console.error("Insert subscription error:", insertError);
        return new Response("DB error", { status: 500 });
      }

      const { data: referral } = await supabase
        .from("indicacoes")
        .select("*, afiliados(*)")
        .eq("referred_user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (referral) {
        const { count } = await supabase
          .from("indicacoes")
          .select("*", { count: "exact", head: true })
          .eq("afiliado_id", referral.afiliado_id)
          .eq("status", "rewarded");

        if ((count ?? 0) < 3) {
          await supabase
            .from("indicacoes")
            .update({ status: "rewarded" })
            .eq("id", referral.id);
        }
      }

      console.log(`Subscription activated for user ${userId}, plan: ${planSlug}`);

      // Notificar admins via push
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", userId)
          .maybeSingle();
        const who = profile?.name || profile?.email || "Usuário";
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: "purchase",
            title: "💰 Compra aprovada",
            body: `${who} ativou o plano ${planSlug} — R$ ${Number(plan.price).toFixed(2)}`,
            url: "/admin/assinaturas",
          }),
        });
      } catch (err) {
        console.error("[push purchase] erro:", err);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
