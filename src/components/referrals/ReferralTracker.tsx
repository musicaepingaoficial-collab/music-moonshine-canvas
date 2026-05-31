import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerPendingReferral } from "@/lib/referrals";

export const ReferralTracker = () => {
  useEffect(() => {
    // Escuta mudanças na autenticação para tentar registrar indicações pendentes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Se temos um código salvo e o usuário acabou de logar ou o token foi renovado
        if (localStorage.getItem("referral_code")) {
          registerPendingReferral();
        }
      }
    });

    // Também tenta ao montar o componente se já houver sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && localStorage.getItem("referral_code")) {
        registerPendingReferral();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
};
