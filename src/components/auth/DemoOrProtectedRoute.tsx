import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, useProfile, useAssinatura, useIsAdmin } from "@/hooks/useUser";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { Loader2 } from "lucide-react";

/**
 * Like ProtectedRoute, but also allows anonymous "demo mode" visitors
 * to browse the page (read-only). Downloads and play limits are gated
 * elsewhere (MusicCard, playerStore).
 */
export function DemoOrProtectedRoute() {
  const { user, loading } = useAuth();
  const { isDemo } = useDemoMode();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: assinatura, isLoading: subLoading } = useAssinatura(user?.id);
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user?.id);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Anonymous demo visitor → just render
  if (!user && isDemo) {
    return <Outlet />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isInitialLoading = profileLoading || subLoading || adminLoading;
  if (isInitialLoading) {
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
