import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useAssinatura, useProfile } from "@/hooks/useUser";
import { SubscriptionDialog } from "@/components/subscription/SubscriptionDialog";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

const PlanosGatePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: assinatura, isLoading: subLoading } = useAssinatura(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!subLoading && assinatura) {
      navigate("/dashboard", { replace: true });
    }
  }, [assinatura, subLoading, navigate]);

  useEffect(() => {
    if (!profileLoading && profile && !profile.whatsapp) {
      navigate("/completar-perfil", { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ["assinatura"] });
    navigate("/dashboard", { replace: true });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (loading || subLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Escolha seu plano para continuar</h1>
        <p className="text-sm text-muted-foreground">
          Para acessar a plataforma, escolha um plano abaixo ou inicie um teste grátis de 1 dia.
        </p>
      </div>

      <SubscriptionDialog open={true} onTrialStarted={handleDone} />
    </div>
  );
};

export default PlanosGatePage;
