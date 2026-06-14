import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor--;
    }
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);
  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
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

    const body = await req.json();
    const {
      token: cardToken,
      issuer_id,
      payment_method_id,
      installments,
      plan,
      payer,
      device_id,
      anonymous,
      coupon_code,
    } = body;


    // ---- Resolver autenticação OU modo anônimo ----
    let user: any = null;
    const authHeader = req.headers.get("Authorization");
    const hasUserToken = authHeader && !authHeader.includes(Deno.env.get("SUPABASE_ANON_KEY") || "___");

    if (authHeader && !anonymous) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: u } } = await supabase.auth.getUser(token);
      if (u) user = u;
    }

    if (!user && !anonymous) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentMethodId = String(payment_method_id || "").trim();
    const isPix = paymentMethodId === "pix";
    const payerEmail = String(payer?.email || user?.email || "").trim().toLowerCase();

    if (!plan || !paymentMethodId) {
      return new Response(JSON.stringify({ error: "Dados de pagamento incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isPix && !cardToken) {
      return new Response(JSON.stringify({ error: "Dados de cartão incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payerEmail) {
      return new Response(JSON.stringify({ error: "E-mail do pagador não informado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: selectedPlan, error: planError } = await supabase
      .from("planos")
      .select("name, price, slug, duration_days")
      .eq("slug", plan)
      .eq("active", true)
      .single();

    if (planError || !selectedPlan) {
      return new Response(JSON.stringify({ error: "Plano inválido ou inativo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Validar cupom no servidor (fonte da verdade) ----
    let finalPrice = Number(selectedPlan.price);
    let appliedCoupon: any = null;
    const couponCodeNorm = String(coupon_code || "").trim().toUpperCase();
    if (couponCodeNorm) {
      const { data: cupom } = await supabase
        .from("cupons")
        .select("*")
        .eq("codigo", couponCodeNorm)
        .eq("ativo", true)
        .maybeSingle();

      const valid =
        cupom &&
        (!cupom.data_expiracao || new Date(cupom.data_expiracao) > new Date()) &&
        (!cupom.uso_limite || (cupom.uso_atual ?? 0) < cupom.uso_limite);

      if (valid) {
        appliedCoupon = cupom;
        const pct = Number(cupom.desconto_percentual) || 0;
        finalPrice = Math.max(0.5, Number((finalPrice * (1 - pct / 100)).toFixed(2)));
      }
    }


    const fullName = String(payer?.full_name || `${payer?.first_name || ""} ${payer?.last_name || ""}`.trim()).trim();
    const namePartsFromFull = splitFullName(fullName);
    const firstName = String(payer?.first_name || namePartsFromFull?.firstName || "").trim();
    const lastName = String(payer?.last_name || namePartsFromFull?.lastName || "").trim();
    const payerCpf = onlyDigits(String(payer?.identification?.number || ""));
    const payerPhone = String(payer?.phone || user?.user_metadata?.whatsapp || "").trim();

    // ---- Modo anônimo: validar dados completos antes de prosseguir ----
    let pendingId: string | null = null;
    if (anonymous) {
      if (!firstName || !lastName) {
        return new Response(JSON.stringify({ error: "Nome completo é obrigatório." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isValidCpf(payerCpf)) {
        return new Response(JSON.stringify({ error: "CPF inválido." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!payerPhone) {
        return new Response(JSON.stringify({ error: "WhatsApp obrigatório." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verificar se e-mail já é uma conta — bloquear
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", payerEmail)
        .maybeSingle();
      if (existingProfile) {
        return new Response(JSON.stringify({
          error: "Este e-mail já tem conta. Faça login antes de pagar.",
          code: "email_exists",
        }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pending, error: pendErr } = await supabase
        .from("pending_subscriptions")
        .insert({
          email: payerEmail,
          full_name: `${firstName} ${lastName}`.trim(),
          cpf: payerCpf,
          whatsapp: payerPhone,
          plan: selectedPlan.slug,
          price: Number(selectedPlan.price),
          payment_method: isPix ? "pix" : "card",
          status: "pending",
        })
        .select("id")
        .single();

      if (pendErr || !pending) {
        console.error("pending insert err:", pendErr);
        return new Response(JSON.stringify({ error: "Falha ao registrar pagamento" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      pendingId = pending.id;
    }

    const mercadoPagoAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mercadoPagoAccessToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payerPayload: Record<string, unknown> = { email: payerEmail };

    if (isPix) {
      if (!firstName || !lastName) {
        return new Response(JSON.stringify({ error: "Pix exige nome completo do titular." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isValidCpf(payerCpf)) {
        return new Response(JSON.stringify({ error: "Pix exige CPF válido do titular." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      payerPayload = {
        ...payerPayload,
        first_name: firstName,
        last_name: lastName,
        identification: { type: "CPF", number: payerCpf },
      };
    } else {
      const identificationType = String(payer?.identification?.type || "").trim();
      const identificationNumber = String(payer?.identification?.number || "").trim();
      if (identificationType && identificationNumber) {
        payerPayload.identification = { type: identificationType, number: identificationNumber };
      }
      if (firstName) payerPayload.first_name = firstName;
      if (lastName) payerPayload.last_name = lastName;
    }

    const externalReference = anonymous
      ? `pending:${pendingId}`
      : `${user.id}:${selectedPlan.slug}`;

    const paymentPayload: Record<string, unknown> = {
      transaction_amount: Number(selectedPlan.price),
      description: `${selectedPlan.name} - MusicaePinga`,
      payment_method_id: paymentMethodId,
      payer: payerPayload,
      external_reference: externalReference,
      statement_descriptor: "MUSICAE PINGA",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      additional_info: {
        items: [{
          id: selectedPlan.slug,
          title: selectedPlan.name,
          description: `Assinatura ${selectedPlan.name}`,
          category_id: "services",
          quantity: 1,
          unit_price: Number(selectedPlan.price),
        }],
        payer: {
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: payerPhone ? {
            area_code: payerPhone.length >= 10 ? payerPhone.slice(0, 2) : undefined,
            number: payerPhone.length >= 10 ? payerPhone.slice(2) : payerPhone,
          } : undefined,
        },
      },
    };

    if (device_id) paymentPayload.metadata = { device_id };

    if (!isPix) {
      paymentPayload.token = cardToken;
      paymentPayload.installments = Number(installments) || 1;
      paymentPayload.issuer_id = issuer_id || undefined;
    } else {
      paymentPayload.payment_type_id = "bank_transfer";
    }

    const idemKey = anonymous
      ? `pending-${pendingId}-${Date.now()}`
      : `${user.id}-${plan}-${Date.now()}`;

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idemKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpData: any = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Mercado Pago error:", mpData);
      const errorMessage = mpData?.message || mpData?.cause?.[0]?.description || "Erro ao processar pagamento";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vincular ID do pagamento MP ao pending registrado
    if (anonymous && pendingId && mpData?.id) {
      await supabase
        .from("pending_subscriptions")
        .update({ mp_payment_id: mpData.id })
        .eq("id", pendingId);
    }

    if (!anonymous && mpData.status === "approved") {
      const expiresAt = selectedPlan.duration_days
        ? new Date(Date.now() + selectedPlan.duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await supabase
        .from("assinaturas")
        .update({ status: "inactive" })
        .eq("user_id", user.id)
        .eq("status", "active");

      await supabase.from("assinaturas").insert({
        user_id: user.id,
        plan: selectedPlan.slug,
        status: "active",
        price: selectedPlan.price,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
    }

    // Para anonymous + cartão aprovado na hora: marca como aprovado para o claim
    if (anonymous && mpData.status === "approved" && pendingId) {
      await supabase
        .from("pending_subscriptions")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", pendingId);
    }

    const transactionData = mpData?.point_of_interaction?.transaction_data || {};

    if (isPix && transactionData.qr_code) {
      try {
        const amount = Number(selectedPlan.price).toFixed(2).replace(".", ",");
        const buyerName = `${firstName} ${lastName}`.trim();
        const who = buyerName || payerEmail || "Cliente";
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: "pix_generated",
            title: `🟢 PIX gerado · R$ ${amount}`,
            body: `${who} — ${selectedPlan.name} — PIX`,
            url: "/admin/notificacoes",
            data: {
              kind: "pix_generated",
              product_type: "subscription",
              plan_slug: selectedPlan.slug,
              plan_name: selectedPlan.name,
              payment_method: "PIX",
              amount: Number(selectedPlan.price),
              buyer_name: buyerName,
              buyer_email: payerEmail,
              buyer_whatsapp: payerPhone,
              buyer_cpf: payerCpf,
              user_id: user?.id || null,
              pending_id: pendingId,
              mp_payment_id: mpData?.id || null,
              anonymous: !!anonymous,
            },
          }),
        });

      } catch (err) {
        console.error("[push pix] erro:", err);
      }
    }

    return new Response(
      JSON.stringify({
        status: mpData.status,
        status_detail: mpData.status_detail,
        id: mpData.id,
        qr_code: transactionData.qr_code,
        qr_code_base64: transactionData.qr_code_base64,
        ticket_url: transactionData.ticket_url,
        pending_id: pendingId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
