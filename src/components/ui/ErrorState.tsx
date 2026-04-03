import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Ocorreu um erro.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-destructive transition-all duration-200">
      <AlertTriangle className="h-10 w-10" />
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-border/50 text-foreground hover:bg-accent"
        >
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
