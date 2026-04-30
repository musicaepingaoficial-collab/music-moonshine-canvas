import { Navigate, Outlet } from "react-router-dom";
import { useAuth, useIsAdmin } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";

export function AdminRoute() {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading, isError } = useIsAdmin(user?.id);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If there's an error loading the admin status, we don't want to just redirect.
  // We should show an error or a retry button, but for now let's just wait for session.
  if (isError && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    console.log("[AdminRoute] Access denied: User is not admin", user.id);
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
