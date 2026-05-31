import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerPendingReferral } from "@/lib/referrals";

export const ReferralTracker = () => {
  useEffect(() => {
    // 1. Captura código da URL em qualquer página (?ref=CODE)
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      console.log("[referral] Código capturado da URL:", ref);
      localStorage.setItem("referral_code", ref);
    }

    // 2. Escuta mudanças na autenticação para registrar indicações
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (localStorage.getItem("referral_code")) {
          registerPendingReferral();
        }
      }
    });

    // 3. Tenta ao montar se já houver sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && localStorage.getItem("referral_code")) {
        registerPendingReferral();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
};
