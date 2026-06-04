import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailTemplate } from "../_shared/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};


function fmtBRL(n: number) {
  return Number(n || 0).toFixed(2).replace(".", ",");
}

function fmtMethod(p: any): string {
  if (!p) return "—";
  if (p.payment_method_id === "pix") return "PIX";
  const t = p.payment_type_id;
  const inst = Number(p.installments || 1);
  if (t === "credit_card") return inst > 1 ? `Cartão ${inst}x` : "Cartão";
  if (t === "debit_card") return "Débito";
  if (t === "ticket") return "Boleto";
  if (t === "account_money") return "Saldo MP";
  return t || "—";
}


async function verifyMpSignature(req: Request, paymentId: string): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("[payment-webhook] MP_WEBHOOK_SECRET not set — rejecting");
    return false;
  }
  const sigHeader = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";
  if (!sigHeader || !requestId) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.trim().split("=") as [string, string])
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === v1;
}

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

    // Verify Mercado Pago signature before doing any work
    const sigOk = await verifyMpSignature(req, paymentId);
    if (!sigOk) {
      console.warn("[payment-webhook] invalid MP signature for paymentId", paymentId);
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 401,
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

    // ==== Notificar admin sobre status não-aprovados ====
    if (payment.status === "rejected" || payment.status === "cancelled") {
      try {
        const amount = fmtBRL(payment.transaction_amount);
        const method = fmtMethod(payment);
        const who = payment.payer?.email || "Cliente";
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: "purchase_rejected",
            title: `❌ Pagamento recusado · R$ ${amount}`,
            body: `${who} — ${method} — ${payment.status_detail || payment.status}`,
            url: "/admin/notificacoes",
            data: {
              kind: "purchase_rejected",
              amount: Number(payment.transaction_amount || 0),
              buyer_email: payment.payer?.email || null,
              payment_method: method,
              status_detail: payment.status_detail || payment.status,
              mp_payment_id: payment.id,
              external_reference: payment.external_reference || null,
            },
          }),
        });

      } catch (err) {
        console.error("[push rejected] erro:", err);
      }
    }

    if (payment.status === "refunded" || payment.status === "charged_back") {
      try {
        const amount = Number(payment.transaction_amount || 0).toFixed(2);
        const refunded = payment.status === "refunded";
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: "purchase_refunded",
            title: refunded ? `↩️ Reembolso — R$ ${amount}` : `⚠️ Chargeback — R$ ${amount}`,
            body: `${payment.payer?.email || "Cliente"}`,
            url: "/admin/notificacoes",
            data: {
              kind: refunded ? "purchase_refunded" : "chargeback",
              amount: Number(payment.transaction_amount || 0),
              buyer_email: payment.payer?.email || null,
              mp_payment_id: payment.id,
              external_reference: payment.external_reference || null,
            },
          }),
        });
      } catch (err) {
        console.error("[push refunded] erro:", err);
      }
    }

    if (payment.status === "approved") {
      const ref = String(payment.external_reference || "");

      // ==== Pagamento anônimo (pré-cadastro) ====
      if (ref.startsWith("pending:")) {
        const pendingId = ref.split(":")[1];
        if (!pendingId) {
          return new Response("Invalid pending ref", { status: 400 });
        }

        // Update only if not already approved/claimed to avoid duplicate notifications
        const { data: currentPending } = await supabase
          .from("pending_subscriptions")
          .select("status")
          .eq("id", pendingId)
          .maybeSingle();

        if (currentPending?.status === "approved" || currentPending?.status === "claimed") {
          return new Response(JSON.stringify({ received: true, note: "Already processed" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updErr } = await supabase
          .from("pending_subscriptions")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            mp_payment_id: payment.id,
          })
          .eq("id", pendingId);

        if (updErr) console.error("update pending err:", updErr);

        try {
          const { data: pending } = await supabase
            .from("pending_subscriptions")
            .select("full_name, email, plan, price, claim_token, whatsapp")
            .eq("id", pendingId)
            .maybeSingle();

          const siteUrl = (Deno.env.get("SITE_URL") || "https://sua-plataforma.com").replace(/\\/g, "/");
          const claimLink = pending ? `${siteUrl}/finalizar-cadastro?token=${pending.claim_token}` : null;

          if (pending) {
            const amount = Number(pending.price).toFixed(2);
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                type: "purchase",
                title: `💰 Venda aprovada — R$ ${amount}`,
                body: `${pending.full_name} • Plano ${pending.plan} (novo usuário)`,
                url: "/admin/notificacoes",
                data: {
                  kind: "purchase_new_user",
                  product_type: "subscription",
                  plan_slug: pending.plan,
                  amount: Number(pending.price),
                  buyer_name: pending.full_name,
                  buyer_email: pending.email,
                  buyer_whatsapp: pending.whatsapp,
                  mp_payment_id: payment.id,
                  pending_id: pendingId,
                  claim_link: claimLink,
                },
              }),
            });

            
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                to: pending.email,
                subject: "Pagamento confirmado! Finalize seu cadastro",
                html: emailTemplate(`
                  <h2>Olá, ${pending.full_name}!</h2>
                  <p>Seu pagamento para o plano <strong>${pending.plan}</strong> foi confirmado com sucesso.</p>
                  <p>Agora falta apenas um passo: criar sua senha de acesso para começar a aproveitar nossa plataforma.</p>
                  <div style="text-align: center;">
                    <a href="${claimLink}" class="button">
                      Criar minha senha agora
                    </a>
                  </div>
                  <p style="color: #888; font-size: 14px; margin-top: 30px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
                  <p class="link-alt">${claimLink}</p>
                `),
              }),
            });
          }

        } catch (err) {
          console.error("[push pending approved]", err);
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
            .select("name, email, whatsapp")
            .eq("id", userId)
            .maybeSingle();
          const who = profile?.name || profile?.email || "Usuário";
          const amount = Number(pdf?.price || 0).toFixed(2);
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              type: "purchase",
              title: `📕 PDF vendido — R$ ${amount}`,
              body: `${who} • "${pdf?.title || "PDF"}"`,
              url: "/admin/notificacoes",
              data: {
                kind: "purchase_pdf",
                product_type: "pdf",
                pdf_id: pdfId,
                pdf_title: pdf?.title || null,
                amount: Number(pdf?.price || 0),
                buyer_name: profile?.name || null,
                buyer_email: profile?.email || null,
                buyer_whatsapp: profile?.whatsapp || null,
                user_id: userId,
                mp_payment_id: payment.id,
              },
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

      // Handle discografias module purchase
      if (planSlug === "discografias") {
        const { error: updErr } = await supabase
          .from("profiles")
          .update({ has_discografias: true })
          .eq("id", userId);

        if (updErr) {
          console.error("Error updating profile has_discografias:", updErr);
          return new Response("DB Error", { status: 500 });
        }

        // Send push notification to admin
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email, whatsapp")
            .eq("id", userId)
            .maybeSingle();
          const who = profile?.name || profile?.email || "Usuário";
          const amount = Number(payment.transaction_amount || 0).toFixed(2);
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              type: "purchase",
              title: `📀 Módulo Discografias — R$ ${amount}`,
              body: `${who} ativou o módulo Discografias`,
              url: "/admin/notificacoes",
              data: {
                kind: "purchase_module",
                product_type: "module",
                module: "discografias",
                amount: Number(payment.transaction_amount || 0),
                buyer_name: profile?.name || null,
                buyer_email: profile?.email || null,
                buyer_whatsapp: profile?.whatsapp || null,
                user_id: userId,
                mp_payment_id: payment.id,
              },
            }),
          });
        } catch (err) {
          console.error("[push disc purchase]", err);
        }


        return new Response(JSON.stringify({ received: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      // Meta CAPI Purchase (server-side, deduplicates with client via event_id)
      try {
        const { data: profileForCapi } = await supabase
          .from("profiles")
          .select("email, whatsapp")
          .eq("id", userId)
          .maybeSingle();
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/meta-capi`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            event_name: "Purchase",
            event_id: String(payment.id),
            action_source: "website",
            user_data: {
              email: profileForCapi?.email,
              phone: profileForCapi?.whatsapp,
              external_id: userId,
            },
            custom_data: {
              value: Number(plan.price),
              currency: payment.currency_id || "BRL",
              content_ids: [planSlug],
              content_name: planSlug,
            },
          }),
        });
      } catch (err) {
        console.error("[meta-capi] erro:", err);
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email, whatsapp")
          .eq("id", userId)
          .maybeSingle();
        const who = profile?.name || profile?.email || "Usuário";
        const amount = Number(plan.price).toFixed(2);
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: "purchase",
            title: `💰 Venda aprovada — R$ ${amount}`,
            body: `${who} • Plano ${planSlug}`,
            url: "/admin/notificacoes",
            data: {
              kind: "purchase_subscription",
              product_type: "subscription",
              plan_slug: planSlug,
              amount: Number(plan.price),
              buyer_name: profile?.name || null,
              buyer_email: profile?.email || null,
              buyer_whatsapp: profile?.whatsapp || null,
              user_id: userId,
              mp_payment_id: payment.id,
            },
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
