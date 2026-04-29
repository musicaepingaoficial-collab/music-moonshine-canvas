import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth, useIsAdmin } from "@/hooks/useUser";
import { AlertTriangle, Loader2 } from "lucide-react";

interface MaintenanceGateProps {
  children: ReactNode;
}

export function MaintenanceGate({ children }: MaintenanceGateProps) {
  const location = useLocation();
  const { data: settings, isLoading } = useSiteSettings();
  const { user, loading: loadingAuth } = useAuth();
  const { data: isAdmin, isLoading: loadingAdmin } = useIsAdmin(user?.id);

  // Rotas sempre permitidas durante manutenção
  const allowedPaths = ["/login", "/admin"];
  const isAllowed =
    allowedPaths.some((p) => location.pathname.startsWith(p)) ||
    location.pathname === "/completar-perfil";

  if (isLoading || loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings?.maintenance_mode) return <>{children}</>;
  if (isAllowed) return <>{children}</>;
  if (loadingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{settings.maintenance_title}</h1>
        <p className="text-muted-foreground whitespace-pre-line">{settings.maintenance_message}</p>
        {settings.whatsapp_number && (
          <a
            href={`https://wa.me/${settings.whatsapp_number}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Falar com suporte
          </a>
        )}
      </div>
    </div>
  );
}
