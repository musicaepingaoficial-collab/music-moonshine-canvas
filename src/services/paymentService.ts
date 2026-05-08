import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface TransparentPaymentData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  plan: string;
  device_id?: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
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
  pending_id?: string;
}

async function postPayment(body: any, anonymous: boolean): Promise<PaymentResponse> {
  let auth = `Bearer ${ANON_KEY}`;
  if (!anonymous) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");
    auth = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ ...body, anonymous }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error || "Falha ao processar pagamento");
    (error as any).code = err.code;
    throw error;
  }

  return response.json();
}

export async function processTransparentPayment(data: TransparentPaymentData): Promise<PaymentResponse> {
  return postPayment(data, false);
}

export async function processAnonymousCardPayment(data: TransparentPaymentData): Promise<PaymentResponse> {
  return postPayment(data, true);
}

export interface PixPaymentData {
  plan: string;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    identification: { type: "CPF"; number: string };
  };
}

export async function createPixPayment(data: PixPaymentData & { device_id?: string }): Promise<PaymentResponse> {
  return postPayment({ ...data, payment_method_id: "pix" }, false);
}

export async function createAnonymousPixPayment(data: PixPaymentData & { device_id?: string }): Promise<PaymentResponse> {
  return postPayment({ ...data, payment_method_id: "pix" }, true);
}

export async function getSubscriptionStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("assinaturas")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Verifica se um pending_subscription foi aprovado (sem auth)
export async function getPendingStatus(pendingId: string): Promise<{ status: string } | null> {
  const { data, error } = await supabase
    .from("pending_subscriptions")
    .select("status")
    .eq("id", pendingId)
    .maybeSingle();
  if (error) {
    // RLS bloqueia; nesse caso usamos a edge function dedicada
    return null;
  }
  return data;
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/check-email-exists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.exists;
}

export async function claimPendingSubscription(params: {
  pending_id?: string;
  claim_token?: string;
  password: string;
}): Promise<{ success: boolean; email: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/claim-pending-subscription`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || "Falha ao finalizar cadastro");
    (error as any).code = data.code;
    (error as any).status = data.status;
    throw error;
  }
  return data;
}

// Verifica status de um pending_subscription sem criar conta
export async function pollPendingApproved(pendingId: string): Promise<{ status: string } | null> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/claim-pending-subscription`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ pending_id: pendingId, check_only: true }),
  });
  if (!res.ok) return null;
  return res.json();
}
