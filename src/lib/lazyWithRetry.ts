import { lazy, ComponentType } from "react";

/**
 * lazy() com retry automático para chunks órfãos após deploy.
 *
 * Quando o Vite gera um novo build, os arquivos antigos com hash são
 * removidos. Se o usuário estiver com a aba aberta e tentar navegar para
 * uma rota lazy, o browser pede o chunk antigo → 404 → "Failed to fetch
 * dynamically imported module".
 *
 * Esta função captura esse erro específico e recarrega a página uma vez.
 * O sessionStorage evita loop infinito caso o erro persista.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");

      if (isChunkError) {
        const key = "lovable:chunk-reload-once";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          // Stub temporário até o reload acontecer
          return { default: (() => null) as unknown as T };
        }
      }
      throw err;
    }
  });
}
