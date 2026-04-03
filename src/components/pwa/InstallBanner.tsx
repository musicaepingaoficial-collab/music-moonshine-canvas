import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { motion, AnimatePresence } from "framer-motion";

export function InstallBanner() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const wasDismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show banner after a short delay for better UX
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem("pwa-banner-dismissed", "true");
    console.log("[InstallBanner:dismiss]");
  };

  const handleInstall = async () => {
    console.log("[InstallBanner:install]");
    const accepted = await install();
    if (accepted) {
      setShow(false);
    }
  };

  if (isInstalled || dismissed || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom"
      >
        <div className="mx-auto max-w-lg rounded-2xl bg-card border border-border p-4 shadow-2xl shadow-primary/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">Instalar MusicaePinga</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Acesse mais rápido direto da sua tela inicial, como um app nativo.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="gap-1.5 text-xs"
                  aria-label="Instalar aplicativo"
                >
                  <Download className="h-3.5 w-3.5" />
                  Instalar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-xs text-muted-foreground"
                  aria-label="Dispensar banner de instalação"
                >
                  Agora não
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
