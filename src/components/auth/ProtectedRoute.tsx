import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, useProfile, useAssinatura, useIsAdmin } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useProfile(user?.id);
  const { data: assinatura, isLoading: subLoading, isFetching: subFetching } = useAssinatura(user?.id);
  const { data: isAdmin, isLoading: adminLoading, isFetching: adminFetching } = useIsAdmin(user?.id);
  const location = useLocation();

  // On the first load, we wait for all critical checks. 
  // Subsequent background refetches (isFetching) shouldn't show the full-screen loader.
  const isInitialLoading = loading || profileLoading || subLoading || adminLoading;

  if (isInitialLoading) {
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

  // Subscription gate: non-admin users without active subscription must pick a plan.
  // We only redirect if we are CERTAIN (not loading) that the user is NOT an admin.
  if (!isAdmin && !assinatura && location.pathname !== "/planos" && location.pathname !== "/completar-perfil") {
    return <Navigate to="/planos" replace />;
  }

  return <Outlet />;
}
