import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptAll, rejectAll, openPreferences, getConsent } from "@/hooks/useCookieConsent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const s = getConsent();
    if (s.status === "pending") {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const close = () => setVisible(false);

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
              Utilizamos cookies essenciais para funcionamento e cookies de análise/marketing
              para melhorar sua experiência. Veja nossa{" "}
              <Link to="/privacidade" className="text-primary underline hover:no-underline">
                Política de Privacidade
              </Link>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { acceptAll(); close(); }} className="bg-primary hover:bg-primary/90">
                Aceitar todos
              </Button>
              <Button size="sm" variant="outline" onClick={() => { rejectAll(); close(); }}>
                Apenas essenciais
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { openPreferences(); close(); }}>
                Personalizar
              </Button>
            </div>
          </div>
          <button
            onClick={() => { rejectAll(); close(); }}
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
