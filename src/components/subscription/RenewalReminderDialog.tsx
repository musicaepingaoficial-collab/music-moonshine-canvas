import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";
import { useRenewalReminder, type Milestone } from "@/hooks/useRenewalReminder";
import { SubscriptionDialog } from "./SubscriptionDialog";

const VARIANT: Record<Milestone, { ring: string; icon: string; title: string; tone: "warn" | "danger" }> = {
  7: { ring: "ring-yellow-500/40", icon: "text-yellow-500", title: "Seu plano vence em 7 dias", tone: "warn" },
  5: { ring: "ring-orange-500/50", icon: "text-orange-500", title: "Faltam 5 dias para seu plano vencer", tone: "warn" },
  3: { ring: "ring-orange-600/60", icon: "text-orange-600", title: "Apenas 3 dias restantes!", tone: "warn" },
  1: { ring: "ring-destructive/60", icon: "text-destructive", title: "Seu plano vence amanhã!", tone: "danger" },
};

export function RenewalReminderDialog() {
  const { show, milestone, dismiss } = useRenewalReminder();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const open = show && !hidden && !checkoutOpen && !!milestone;
  const cfg = milestone ? VARIANT[milestone] : null;

  const handleRenew = () => {
    setHidden(true);
    setCheckoutOpen(true);
  };

  const handleLater = () => {
    dismiss();
    setHidden(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleLater(); }}>
        {cfg && milestone && (
          <DialogContent className={`sm:max-w-md ring-2 ${cfg.ring}`}>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                {cfg.tone === "danger" ? (
                  <AlertTriangle className={`h-7 w-7 ${cfg.icon}`} />
                ) : (
                  <Clock className={`h-7 w-7 ${cfg.icon}`} />
                )}
              </div>
              <DialogTitle className="text-center text-xl">{cfg.title}</DialogTitle>
              <DialogDescription className="text-center">
                Renove agora para não perder o acesso às músicas, downloads e repertórios.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-2">
              <Button size="lg" onClick={handleRenew} className="w-full">
                Renovar agora
              </Button>
              <Button size="sm" variant="ghost" onClick={handleLater} className="w-full">
                Lembrar depois
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {checkoutOpen && (
        <SubscriptionDialog
          open={checkoutOpen}
          onTrialStarted={() => setCheckoutOpen(false)}
        />
      )}
    </>
  );
}
