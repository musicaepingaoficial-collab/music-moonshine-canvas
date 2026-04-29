import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, useProfile, useAssinatura, useIsAdmin } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading, isFetching } = useProfile(user?.id);
  const { data: assinatura, isLoading: subLoading } = useAssinatura(user?.id);
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin(user?.id);
  const location = useLocation();

  if (loading || profileLoading || isFetching || subLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to complete profile if whatsapp is missing
  if (!profile?.whatsapp && location.pathname !== "/completar-perfil") {
    return <Navigate to="/completar-perfil" replace />;
  }

  // Subscription gate: non-admin users without active subscription must pick a plan
  if (!isAdmin && !assinatura && location.pathname !== "/planos" && location.pathname !== "/completar-perfil") {
    return <Navigate to="/planos" replace />;
  }

  return <Outlet />;
}
