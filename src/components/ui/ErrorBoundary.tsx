import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  recovering: boolean;
}

const RECOVERY_KEY = "lovable:instance-error-recovered";

function isStalePixelError(error: Error): boolean {
  return error.message.includes("Cannot redefine property: instance");
}

function canAttemptRecovery(error: Error): boolean {
  return isStalePixelError(error) && !sessionStorage.getItem(RECOVERY_KEY);
}

async function clearBrowserAppCaches() {
  const tasks: Promise<unknown>[] = [];
  if ("serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    );
  }
  if ("caches" in window) {
    tasks.push(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
  await Promise.allSettled(tasks);
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, recovering: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.log("[ErrorBoundary:caught]", error.message);
    return { hasError: true, error, recovering: canAttemptRecovery(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log("[ErrorBoundary:details]", { error: error.message, stack: info.componentStack });
    if (canAttemptRecovery(error)) {
      sessionStorage.setItem(RECOVERY_KEY, "1");
      void clearBrowserAppCaches().finally(() => window.location.reload());
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.recovering) {
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Atualizando aplicação</h2>
            <p className="text-sm text-muted-foreground max-w-md text-center">
              Limpando arquivos antigos do navegador e recarregando.
            </p>
          </div>
        );
      }
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground max-w-md text-center">
              {this.state.error?.message || "Ocorreu um erro inesperado."}
            </p>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null, recovering: false })}
              className="border-border/50 text-foreground hover:bg-accent"
            >
              Tentar novamente
            </Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
