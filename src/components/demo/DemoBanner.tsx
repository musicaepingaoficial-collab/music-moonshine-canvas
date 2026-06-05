import { useDemoMode } from "@/contexts/DemoModeContext";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DemoBanner() {
  const { isDemo, playsLeft, playsLimit, deactivateDemo } = useDemoMode();
  const navigate = useNavigate();

  if (!isDemo) return null;

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-2 border-b border-primary/30 bg-primary/10 px-3 py-2 text-xs sm:text-sm">
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="text-foreground">
        Modo demonstração — <strong>{playsLeft}</strong> de {playsLimit} músicas restantes
      </span>
      <Button size="sm" className="h-7 px-3" onClick={() => navigate("/ofertas")}>
        Assinar agora
      </Button>
      <button
        onClick={() => {
          deactivateDemo();
          navigate("/");
        }}
        className="ml-1 text-muted-foreground hover:text-foreground"
        aria-label="Sair do modo demo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
