const RECOVERY_FLAG = "pwa-recovery-attempted";
const RELOAD_FLAG = "pwa-reloaded-once";

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

// Poll de /version.json a cada 60s para detectar deploy novo enquanto a aba está aberta
function startVersionPoll(getRegistration: () => ServiceWorkerRegistration | null) {
  let initialVersion: string | null = null;

  const fetchVersion = async (): Promise<string | null> => {
    try {
      const res = await fetch("/version.json", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data?.version === "string" ? data.version : null;
    } catch {
      return null;
    }
  };

  const check = async () => {
    if (document.visibilityState !== "visible") return;
    const current = await fetchVersion();
    if (!current) return;
    if (initialVersion === null) {
      initialVersion = current;
      return;
    }
    if (current !== initialVersion) {
      const reg = getRegistration();
      if (reg) {
        try {
          await reg.update();
        } catch {
          /* noop */
        }
      } else {
        // Sem SW: força reload direto (o .htaccess garante HTML fresco)
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
        }
      }
    }
  };

  // Primeira leitura imediata + a cada 60s + sempre que voltar a ficar visível
  void check();
  setInterval(() => void check(), 60_000);
  document.addEventListener("visibilitychange", () => void check());
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

  // Quando um SW novo assume controle, recarrega automaticamente — sem prompt
  if ("serviceWorker" in navigator) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }

  // Em produção: registrar o SW (autoUpdate) e iniciar polling de versão
  if (!import.meta.env.PROD) return;

  let registration: ServiceWorkerRegistration | null = null;

  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({
        immediate: true,
        onRegisteredSW(_swUrl, reg) {
          if (reg) {
            registration = reg;
            sessionStorage.removeItem(RECOVERY_FLAG);
          }
        },
        onRegisterError(error) {
          console.warn("[pwa] erro no registro do SW:", error);
        },
      });
    })
    .catch((err) => console.warn("[pwa] virtual:pwa-register indisponível:", err));

  startVersionPoll(() => registration);
}
