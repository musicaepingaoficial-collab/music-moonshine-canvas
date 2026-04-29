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
      const ref = String(payment.external_reference || "");

      // ==== Compra avulsa de PDF ====
      if (ref.startsWith("pdf:")) {
        const [, userId, pdfId] = ref.split(":");
        if (!userId || !pdfId) {
          console.error("Invalid pdf reference:", ref);
          return new Response("Invalid reference", { status: 400 });
        }

        const { data: pdf } = await supabase
          .from("pdfs")
          .select("title, price")
          .eq("id", pdfId)
          .maybeSingle();

        const { error: updErr } = await supabase
          .from("pdf_purchases")
          .update({ status: "approved" })
          .eq("user_id", userId)
          .eq("pdf_id", pdfId)
          .eq("payment_id", String(payment.id));

        if (updErr) console.error("update pdf_purchase err:", updErr);

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
              title: "📕 PDF vendido",
              body: `${who} comprou "${pdf?.title || "PDF"}" — R$ ${Number(pdf?.price || 0).toFixed(2)}`,
              url: "/admin/financeiro",
            }),
          });
        } catch (err) {
          console.error("[push pdf purchase]", err);
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ==== Assinatura (fluxo original) ====
      const [userId, planSlug] = ref.split(":");
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

      // ---------- Programa de indicações ----------
      const { data: referral } = await supabase
        .from("indicacoes")
        .select("*, afiliados(*)")
        .eq("referred_user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (referral) {
        const afiliadoId = referral.afiliado_id;
        const indicadorId = (referral as any).afiliados?.user_id;

        // marca a indicação como recompensada
        await supabase
          .from("indicacoes")
          .update({ status: "rewarded" })
          .eq("id", referral.id);

        // recontagem
        const { count: rewardedCount } = await supabase
          .from("indicacoes")
          .select("*", { count: "exact", head: true })
          .eq("afiliado_id", afiliadoId)
          .eq("status", "rewarded");

        const total = rewardedCount ?? 0;

        if (indicadorId) {
          if (total >= 10) {
            // Vitalício: encerra ativas e cria vitalícia
            const { data: jaVitalicio } = await supabase
              .from("assinaturas")
              .select("id")
              .eq("user_id", indicadorId)
              .eq("plan", "vitalicio")
              .eq("status", "active")
              .maybeSingle();

            if (!jaVitalicio) {
              await supabase
                .from("assinaturas")
                .update({ status: "superseded" })
                .eq("user_id", indicadorId)
                .eq("status", "active");

              await supabase.from("assinaturas").insert({
                user_id: indicadorId,
                plan: "vitalicio",
                status: "active",
                price: 0,
                starts_at: new Date().toISOString(),
                expires_at: null,
              });

              await supabase.from("notificacoes").insert({
                user_id: indicadorId,
                type: "success",
                title: "🎉 Acesso vitalício desbloqueado!",
                message: "Você atingiu 10 indicações premiadas e ganhou acesso vitalício ao sistema.",
              });
            }
          } else {
            // +30 dias na assinatura ativa, ou cria mensal de 30 dias
            const { data: ativa } = await supabase
              .from("assinaturas")
              .select("*")
              .eq("user_id", indicadorId)
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .maybeSingle();

            if (ativa) {
              const base = ativa.expires_at ? new Date(ativa.expires_at) : new Date();
              const novaData = base > new Date() ? base : new Date();
              novaData.setDate(novaData.getDate() + 30);
              if (ativa.expires_at !== null) {
                await supabase
                  .from("assinaturas")
                  .update({ expires_at: novaData.toISOString() })
                  .eq("id", ativa.id);
              }
            } else {
              const expira = new Date();
              expira.setDate(expira.getDate() + 30);
              await supabase.from("assinaturas").insert({
                user_id: indicadorId,
                plan: "mensal",
                status: "active",
                price: 0,
                starts_at: new Date().toISOString(),
                expires_at: expira.toISOString(),
              });
            }

            await supabase.from("notificacoes").insert({
              user_id: indicadorId,
              type: "success",
              title: "🎁 Você ganhou 1 mês grátis!",
              message: `Sua indicação assinou um plano. Total de indicações premiadas: ${total}/10.`,
            });
          }
        }
      }

      console.log(`Subscription activated for user ${userId}, plan: ${planSlug}`);

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
