import { supabase } from "@/integrations/supabase/client";

export async function registerPendingReferral() {
  try {
    const ref = localStorage.getItem("referral_code");
    if (!ref) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    console.log("[referral] Tentando registrar indicação:", ref);
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "register-referral", referralCode: ref }),
      }
    );

    if (response.ok) {
      console.log("[referral] Indicação registrada com sucesso");
      localStorage.removeItem("referral_code");
    } else {
      const err = await response.json();
      console.warn("[referral] Erro ao registrar:", err);
      // Se o erro for "Já indicado", removemos para não ficar tentando
      if (err.error?.includes("Já indicado") || err.error?.includes("inválido")) {
        localStorage.removeItem("referral_code");
      }
    }
  } catch (e) {
    console.warn("[referral] Erro inesperado:", e);
  }
}
