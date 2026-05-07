import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function VersionChecker() {
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    // Only check for updates in production
    if (import.meta.env.DEV) return;

    let lastHash: string | null = null;

    const checkVersion = async () => {
      try {
        // We fetch the main HTML to check for script hash changes
        const response = await fetch("/?t=" + Date.now(), { cache: "no-store" });
        const text = await response.text();
        
        // Extract the main JS bundle hash from the script tag
        // Vite typically names bundles like assets/index-HASH.js
        const match = text.match(/assets\/index-([a-z0-9]+)\.js/i);
        const currentHash = match ? match[1] : null;

        if (lastHash && currentHash && lastHash !== currentHash) {
          setShowReload(true);
          toast.info("Uma nova atualização está disponível!", {
            description: "Clique em atualizar para ver as novidades.",
            duration: Infinity,
            action: {
              label: "Atualizar",
              onClick: () => window.location.reload(),
            },
          });
        }

        if (currentHash) {
          lastHash = currentHash;
        }
      } catch (err) {
        console.warn("Falha ao verificar versão:", err);
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    
    // Initial check
    checkVersion();

    return () => clearInterval(interval);
  }, []);

  if (!showReload) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-bold whitespace-nowrap">Nova versão disponível!</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => window.location.reload()}
            className="h-8 gap-2 font-bold shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar agora
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => setShowReload(false)}
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
