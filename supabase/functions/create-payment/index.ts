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

    const body = await req.json();
    const {
      token: cardToken,
      issuer_id,
      payment_method_id,
      installments,
      plan,
      payer,
      device_id,
    } = body;

    const paymentMethodId = String(payment_method_id || "").trim();
    const isPix = paymentMethodId === "pix";
    const payerEmail = String(payer?.email || user.email || "").trim();

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

    const mercadoPagoAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mercadoPagoAccessToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado. Contate o suporte." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payerPhone = String(payer?.phone || user.user_metadata?.whatsapp || user.user_metadata?.phone || "").trim();
    let payerPayload: Record<string, unknown> = { email: payerEmail };

    const fullName = String(payer?.full_name || payer?.first_name + " " + (payer?.last_name || "") || "").trim();
    const namePartsFromFull = splitFullName(fullName);
    const firstName = String(payer?.first_name || namePartsFromFull?.firstName || "").trim();
    const lastName = String(payer?.last_name || namePartsFromFull?.lastName || "").trim();

    if (isPix) {
      const identificationType = String(payer?.identification?.type || "CPF").trim().toUpperCase();
      const cpf = onlyDigits(String(payer?.identification?.number || ""));

      if (!firstName || !lastName) {
        return new Response(JSON.stringify({ error: "Pix exige nome completo do titular." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (identificationType !== "CPF" || !isValidCpf(cpf)) {
        return new Response(JSON.stringify({ error: "Pix exige CPF válido do titular." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      payerPayload = {
        ...payerPayload,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: "CPF",
          number: cpf,
        },
      };
    } else {
      const identificationType = String(payer?.identification?.type || "").trim();
      const identificationNumber = String(payer?.identification?.number || "").trim();
      if (identificationType && identificationNumber) {
        payerPayload = {
          ...payerPayload,
          identification: {
            type: identificationType,
            number: identificationNumber,
          },
        };
      }
      if (firstName) payerPayload.first_name = firstName;
      if (lastName) payerPayload.last_name = lastName;
    }

    const paymentPayload: Record<string, unknown> = {
      transaction_amount: Number(selectedPlan.price),
      description: `${selectedPlan.name} - MusicaePinga`,
      payment_method_id: paymentMethodId,
      payer: payerPayload,
      external_reference: `${user.id}:${selectedPlan.slug}`,
      statement_descriptor: "MUSICAE PINGA",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      additional_info: {
        items: [
          {
            id: selectedPlan.slug,
            title: selectedPlan.name,
            description: `Assinatura ${selectedPlan.name}`,
            category_id: "services",
            quantity: 1,
            unit_price: Number(selectedPlan.price),
          }
        ],
        payer: {
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          phone: payerPhone ? {
            area_code: payerPhone.length >= 10 ? payerPhone.slice(0, 2) : undefined,
            number: payerPhone.length >= 10 ? payerPhone.slice(2) : payerPhone
          } : undefined,
        }
      }
    };

    // Pontuação máxima: device_id é fundamental para prevenção de fraude
    if (device_id) {
      paymentPayload.metadata = { device_id };
    }

    if (!isPix) {
      paymentPayload.token = cardToken;
      paymentPayload.installments = Number(installments) || 1;
      paymentPayload.issuer_id = issuer_id || undefined;
    } else {
      paymentPayload.payment_type_id = "bank_transfer";
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${user.id}-${plan}-${Date.now()}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const mpData: any = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Mercado Pago error:", mpData);
      const errorMessage = mpData?.message || mpData?.cause?.[0]?.description || "Erro ao processar pagamento";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mpData.status === "approved") {
      const expiresAt = selectedPlan.duration_days
        ? new Date(Date.now() + selectedPlan.duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await supabase
        .from("assinaturas")
        .update({ status: "inactive" })
        .eq("user_id", user.id)
        .eq("status", "active");

      const { error: insertError } = await supabase.from("assinaturas").insert({
        user_id: user.id,
        plan: selectedPlan.slug,
        status: "active",
        price: selectedPlan.price,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
      });

      if (insertError) {
        console.error("Insert subscription error:", insertError);
        return new Response(JSON.stringify({ error: "Erro ao ativar assinatura" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const transactionData = mpData?.point_of_interaction?.transaction_data || {};

    // Notificar admins quando um Pix é gerado
    if (isPix && transactionData.qr_code) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: "pix_generated",
            title: "🟢 Pix gerado",
            body: `Plano ${selectedPlan.slug} — R$ ${Number(selectedPlan.price).toFixed(2)} aguardando pagamento`,
            url: "/admin/assinaturas",
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
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
