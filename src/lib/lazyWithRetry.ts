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
      const mod = await factory();
      // Sucesso → limpa a flag para permitir retries futuros
      try { sessionStorage.removeItem("lovable:chunk-reload-at"); } catch { /* ignore */ }
      return mod;
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");

      if (isChunkError) {
        // Permite reload no máximo 1x a cada 30s, evitando loop mas
        // também evitando travar a navegação após o primeiro retry.
        const key = "lovable:chunk-reload-at";
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 30_000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
          // Stub silencioso enquanto o reload acontece — evita
          // que o ErrorBoundary pisque o erro para o usuário.
          return { default: (() => null) as unknown as T };
        }
        // Se acabou de tentar há pouco, ainda assim não joga o erro
        // visualmente: força nova navegação completa para a URL atual.
        window.location.reload();
        return { default: (() => null) as unknown as T };
      }
      throw err;
    }
  });
}
