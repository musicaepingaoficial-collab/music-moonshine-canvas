import { toast } from "sonner";

const RECOVERY_FLAG = "pwa-recovery-attempted";

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h.includes("lovableproject.com") ||
    h.includes("lovable.app") ||
    h.includes("id-preview--") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

async function nukeServiceWorkerAndCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    console.warn("[pwa] cleanup falhou:", err);
  }
}

async function recoverAndReload(reason: string) {
  if (sessionStorage.getItem(RECOVERY_FLAG)) {
    console.warn("[pwa] já tentei recuperar nesta sessão, abortando:", reason);
    return;
  }
  sessionStorage.setItem(RECOVERY_FLAG, "1");
  console.warn("[pwa] recuperando por:", reason);
  await nukeServiceWorkerAndCaches();
  window.location.reload();
}

export function registerPwa() {
  if (typeof window === "undefined") return;

  // Dentro do preview do Lovable ou iframe → desregistrar tudo e sair
  if (isInIframe() || isPreviewHost()) {
    void nukeServiceWorkerAndCaches();
    return;
  }

  // Chunks JS/CSS que falham depois de um deploy = SW antigo servindo HTML velho
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault?.();
    void recoverAndReload("vite:preloadError");
  });

  window.addEventListener("error", (e) => {
    const msg = String(e?.message || "");
    const src = (e?.target as HTMLScriptElement | HTMLLinkElement | null)?.getAttribute?.("src") || "";
    if (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      src.includes("/assets/")
    ) {
      void recoverAndReload("script-error:" + (msg || src));
    }
  });

  // Em produção: registrar com prompt de atualização
  if (!import.meta.env.PROD) return;

  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          toast.info("Nova versão disponível", {
            description: "Toque em atualizar para carregar as novidades.",
            duration: Infinity,
            action: {
              label: "Atualizar",
              onClick: () => updateSW(true),
            },
          });
        },
        onRegisteredSW(_swUrl, registration) {
          // Limpa flag de recuperação após primeiro registro bem-sucedido
          if (registration?.active) {
            sessionStorage.removeItem(RECOVERY_FLAG);
          }
        },
        onRegisterError(error) {
          console.warn("[pwa] erro no registro do SW:", error);
        },
      });
    })
    .catch((err) => console.warn("[pwa] virtual:pwa-register indisponível:", err));
}
