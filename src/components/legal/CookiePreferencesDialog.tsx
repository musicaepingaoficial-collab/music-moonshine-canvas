import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export function CookiePreferencesDialog() {
  const { consent, setConsent } = useCookieConsent();
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [marketing, setMarketing] = useState(consent.marketing);

  useEffect(() => {
    const handler = () => {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
      setOpen(true);
    };
    window.addEventListener("cookie-preferences-open", handler);
    return () => window.removeEventListener("cookie-preferences-open", handler);
  }, [consent]);

  const save = () => {
    setConsent({ analytics, marketing });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preferências de cookies</DialogTitle>
          <DialogDescription>
            Escolha quais categorias de cookies podem ser utilizadas. Cookies essenciais são sempre ativos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-sm">Essenciais</p>
              <p className="text-xs text-muted-foreground">Necessários para login, sessão e segurança.</p>
            </div>
            <Switch checked disabled />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-sm">Análise</p>
              <p className="text-xs text-muted-foreground">Ajudam a entender o uso da plataforma (Google Analytics).</p>
            </div>
            <Switch checked={analytics} onCheckedChange={setAnalytics} />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-sm">Marketing</p>
              <p className="text-xs text-muted-foreground">Personalização de anúncios (Meta, TikTok, Google Ads, Kwai).</p>
            </div>
            <Switch checked={marketing} onCheckedChange={setMarketing} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar preferências</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
