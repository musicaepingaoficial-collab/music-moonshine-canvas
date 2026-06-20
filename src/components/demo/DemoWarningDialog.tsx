import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { Music2, Sparkles, Crown } from "lucide-react";

const WARN_AT = 3; // disparar quando atingir 3 plays (faltam 2)
const SEEN_KEY = "demo_warn_3of5_seen";

export function DemoWarningDialog() {
  const { isDemo, playsUsed, playsLimit, playsLeft, openGate } = useDemoMode();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isDemo) return;
    if (playsUsed < WARN_AT) return;
    if (playsLeft <= 0) return; // nesse caso o gate principal cuida
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SEEN_KEY) === "1") return;
    sessionStorage.setItem(SEEN_KEY, "1");
    setOpen(true);
  }, [isDemo, playsUsed, playsLeft]);

  if (!isDemo) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-5 sm:p-6 bg-card/95 backdrop-blur border-border/60">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-glow">
            <Music2 className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl sm:text-2xl font-black tracking-tight">
            Faltam só {playsLeft} músicas! 🎧
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base leading-relaxed">
            Você já ouviu <strong>{playsUsed}</strong> de {playsLimit} músicas do seu teste grátis.
            Assine agora e ouça <strong>ilimitado</strong> + baixe tudo sem travas.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center text-sm">
          <Sparkles className="inline h-4 w-4 text-primary mr-1" />
          Menos de <span className="font-bold text-primary">R$ 0,27 por dia</span> no plano anual
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            size="lg"
            onClick={() => {
              setOpen(false);
              openGate("plays");
            }}
            className="w-full h-12 text-base font-black bg-gradient-cta text-primary-foreground shadow-glow hover:opacity-95"
          >
            <Crown className="mr-1 h-4 w-4" />
            QUERO OUVIR ILIMITADO
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Continuar ouvindo o teste
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
