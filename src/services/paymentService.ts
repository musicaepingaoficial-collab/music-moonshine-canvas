import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface TransparentPaymentData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  plan: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification: { type: string; number: string };
  };
}

export interface PaymentResponse {
  status: string;
  status_detail: string;
  id: number;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

export async function processTransparentPayment(data: TransparentPaymentData): Promise<PaymentResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-payment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Falha ao processar pagamento");
  }

  return response.json();
}

export interface PixPaymentData {
  plan: string;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    identification: { type: "CPF"; number: string };
  };
}

export async function createPixPayment(data: PixPaymentData): Promise<PaymentResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-payment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        plan: data.plan,
        payment_method_id: "pix",
        payer: data.payer,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Falha ao criar pagamento Pix");
  }

  return response.json();
}

export async function getSubscriptionStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("NÃ£o autenticado");

  const { data, error } = await supabase
    .from("assinaturas")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}
