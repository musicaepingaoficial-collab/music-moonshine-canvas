import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { motion, AnimatePresence } from "framer-motion";

export function InstallBanner() {
  const { platform, installed, canPrompt, shouldShow, promptInstall, dismiss } = usePWAInstall();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [shouldShow]);

  const handleInstall = async () => {
    if (canPrompt) {
      const accepted = await promptInstall();
      if (accepted) setShow(false);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setShow(false);
  };

  if (installed || !shouldShow || !show) return null;

  const platformLabel =
    platform === "ios" ? "iPhone / iPad" : platform === "android" ? "Android" : "computador";

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
              <p className="font-semibold text-foreground text-sm">Instalar o app</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Acesse mais rápido no seu {platformLabel}, direto da tela inicial.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {canPrompt ? (
                  <Button size="sm" onClick={handleInstall} className="gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    Instalar
                  </Button>
                ) : (
                  <Button size="sm" asChild className="gap-1.5 text-xs">
                    <Link to="/instalar">
                      <Download className="h-3.5 w-3.5" />
                      Como instalar
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild className="text-xs">
                  <Link to="/instalar">Ver tutorial</Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-xs text-muted-foreground"
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
