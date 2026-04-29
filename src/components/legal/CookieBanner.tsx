import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) {
      // pequeno delay para não competir com o load
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const setConsent = (value: "accepted" | "rejected") => {
    localStorage.setItem(STORAGE_KEY, value);
    localStorage.setItem(`${STORAGE_KEY}_at`, new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:max-w-md z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Usamos cookies</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Utilizamos cookies essenciais para o funcionamento e cookies de análise/marketing para melhorar sua
              experiência. Saiba mais na nossa{" "}
              <Link to="/privacidade" className="text-primary underline hover:no-underline">
                Política de Privacidade
              </Link>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setConsent("accepted")} className="bg-primary hover:bg-primary/90">
                Aceitar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConsent("rejected")}>
                Apenas essenciais
              </Button>
            </div>
          </div>
          <button
            onClick={() => setConsent("rejected")}
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
