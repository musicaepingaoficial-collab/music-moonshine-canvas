import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base: string, factor: number) => {
    let total = 0;
    for (const d of base) total += Number(d) * factor--;
    const r = total % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    calc(cpf.slice(0, 10), 11) === Number(cpf[10]);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdf_id, payer } = await req.json();
    if (!pdf_id) {
      return new Response(JSON.stringify({ error: "pdf_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pdf, error: pdfError } = await supabase
      .from("pdfs")
      .select("id, title, price, access_type, active")
      .eq("id", pdf_id)
      .single();

    if (pdfError || !pdf || !pdf.active || pdf.access_type !== "paid") {
      return new Response(JSON.stringify({ error: "PDF indisponível" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Já comprado?
    const { data: existing } = await supabase
      .from("pdf_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("pdf_id", pdf_id)
      .eq("status", "approved")
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Você já comprou este PDF" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullName = String(payer?.full_name || "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    const cpf = onlyDigits(String(payer?.identification?.number || ""));
    const payerEmail = String(payer?.email || user.email || "").trim();

    if (!firstName || !lastName) {
      return new Response(JSON.stringify({ error: "Pix exige nome completo do titular" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidCpf(cpf)) {
      return new Response(JSON.stringify({ error: "CPF inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mpToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalRef = `pdf:${user.id}:${pdf.id}`;
    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${user.id}-${pdf.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: Number(pdf.price),
        description: `PDF: ${pdf.title}`,
        payment_method_id: "pix",
        payment_type_id: "bank_transfer",
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: { type: "CPF", number: cpf },
        },
        external_reference: externalRef,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      }),
    });
    const mp: any = await mpResp.json();
    if (!mpResp.ok) {
      console.error("MP error:", mp);
      return new Response(JSON.stringify({
        error: mp?.message || mp?.cause?.[0]?.description || "Erro no pagamento",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("pdf_purchases").insert({
      user_id: user.id,
      pdf_id: pdf.id,
      amount: Number(pdf.price),
      payment_id: String(mp.id),
      status: "pending",
    });

    // Push admin: pix gerado
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          type: "pix_generated",
          title: "🧾 Pix gerado (PDF)",
          body: `${payerEmail} gerou Pix de R$ ${Number(pdf.price).toFixed(2)} — ${pdf.title}`,
          url: "/admin/financeiro",
        }),
      });
    } catch (e) {
      console.error("[push pix pdf]", e);
    }

    const tx = mp.point_of_interaction?.transaction_data || {};
    return new Response(JSON.stringify({
      payment_id: mp.id,
      status: mp.status,
      qr_code: tx.qr_code,
      qr_code_base64: tx.qr_code_base64,
      ticket_url: tx.ticket_url,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("create-pdf-payment error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
