import { lazy, ComponentType } from "react";

/**
 * lazy() com retry automático para chunks órfãos após deploy/HMR.
 *
 * Quando o Vite gera um novo build (ou o HMR invalida um chunk antigo),
 * o browser pede um arquivo com hash que não existe mais → 404 →
 * "Failed to fetch dynamically imported module".
 *
 * Esta função captura esse erro e força um reload completo. Em vez de
 * renderizar um stub (que faz o ErrorBoundary piscar por um instante),
 * retornamos uma Promise que nunca resolve — assim o Suspense mantém o
 * fallback até o reload acontecer.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      try { sessionStorage.removeItem("lovable:chunk-reload-at"); } catch { /* ignore */ }
      return mod;
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module") ||
        msg.includes("Cannot redefine property");

      if (isChunkError) {
        const key = "lovable:chunk-reload-at";
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 30_000) {
          sessionStorage.setItem(key, String(Date.now()));
        }
        window.location.reload();
        // Hang forever so Suspense keeps showing the fallback (no flash).
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
