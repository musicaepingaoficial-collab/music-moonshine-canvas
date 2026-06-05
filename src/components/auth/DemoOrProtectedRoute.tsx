import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, useProfile, useAssinatura, useIsAdmin } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/contexts/DemoModeContext";

/**
 * Allows:
 *  - logged-in users with profile+subscription (or admin), like ProtectedRoute
 *  - anonymous Supabase users (demo mode) — read-only browsing
 * Otherwise redirects to /login.
 */
export function DemoOrProtectedRoute() {
  const { user, loading } = useAuth();
  const isAnonymous = !!(user as any)?.is_anonymous;
  const { data: profile, isLoading: profileLoading } = useProfile(isAnonymous ? null : user?.id);
  const { data: assinatura, isLoading: subLoading } = useAssinatura(isAnonymous ? null : user?.id);
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(isAnonymous ? null : user?.id);
  const location = useLocation();
  const { isActivatingDemo, demoActivationError } = useDemoMode();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Anonymous (demo) user → just render, server enforces limits
  if (isAnonymous) {
    return <Outlet />;
  }

  // Allow URL ?demo=1 to render briefly while signInAnonymously resolves
  if (!user) {
    if (typeof window !== "undefined") {
      const wantsDemo =
        new URLSearchParams(window.location.search).get("demo") === "1" ||
        sessionStorage.getItem("demo_pending") === "1";
      if (wantsDemo) {
        if (demoActivationError) {
          return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4 text-center">
              <div className="max-w-md space-y-4 rounded-lg border border-border bg-card p-6 shadow-lg">
                <h1 className="text-xl font-semibold text-foreground">Modo demonstração indisponível</h1>
                <p className="text-sm text-muted-foreground">
                  O Supabase ainda está recusando o login anônimo: {demoActivationError}.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
                  <Button variant="outline" onClick={() => (window.location.href = "/")}>Voltar</Button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        );
      }
    }
    if (isActivatingDemo) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  if (profileLoading || subLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile?.whatsapp && location.pathname !== "/completar-perfil") {
    return <Navigate to="/completar-perfil" replace />;
  }

  if (!isAdmin && !assinatura && location.pathname !== "/planos" && location.pathname !== "/completar-perfil") {
    return <Navigate to="/planos" replace />;
  }

  return <Outlet />;
}
