## Problema

Ao atualizar o PWA (abrir após um novo deploy), o app fica preso em uma tela com um círculo de loading que nunca termina. Para recuperar, o usuário precisa fechar o app, limpar cache ou reinstalar.

## Causa raiz (análise técnica)

O projeto usa `vite-plugin-pwa` em modo `injectManifest` com um Service Worker próprio (`src/sw.ts`). A combinação atual cria um deadlock entre o SW antigo (em cache) e o novo build:

1. **`registerType: "autoUpdate"` + `skipWaiting()` + `clients.claim()` simultâneos**
   No `src/sw.ts` o novo SW chama `skipWaiting()` no `install` e `clients.claim()` no `activate`. Isso força o novo SW a assumir o controle das abas abertas no meio da navegação. Como o `injectManifest` faz `precacheAndRoute(self.__WB_MANIFEST)`, o novo SW começa a baixar TODO o manifesto de assets antes de responder qualquer requisição — qualquer fetch de chunk JS feito pelo React nesse intervalo fica pendurado, e o app trava no spinner inicial.

2. **`NavigationRoute` com `NetworkFirst` + fallback síncrono para `/index.html` precacheado**
   A rota de navegação tenta rede com timeout de 5s e, em caso de erro, devolve `caches.match("/index.html")`. O problema: o `index.html` em cache referencia hashes de chunks JS **da versão antiga** (`/assets/index-OLDHASH.js`). Após o deploy, esses arquivos não existem mais no servidor. O navegador carrega o HTML antigo do cache, tenta buscar o JS antigo (404), e o app nunca monta o React — fica só o spinner do `index.html`.

3. **`VersionChecker` recarrega a página, mas o SW ainda serve o HTML velho**
   O `VersionChecker.tsx` detecta nova versão e chama `window.location.reload()`. Como o SW intercepta a navegação e devolve o HTML cacheado (mesmo com `NetworkFirst`, qualquer lentidão > 5s cai no fallback), o reload entrega de novo o HTML antigo apontando para chunks que não existem.

4. **Sem `navigateFallbackDenylist` adequado**
   Apenas `/~oauth` está na denylist. Rotas como `/dashboard`, `/login`, `/repertorios` passam pelo SW, então qualquer falha cai no `index.html` cacheado.

5. **Manifesto pinado no install do PWA**
   `start_url: "/"` + `display: "standalone"` foram pinados quando o usuário instalou. Não dá para "burlar" o SW antigo só mudando o manifest — precisa de uma estratégia ativa de auto-cura.

6. **Sem guard contra iframe / preview**
   Em produção tudo bem, mas dentro do preview do Lovable o SW se registra e polui o cache, dificultando debug.

## Sintoma visível

```text
Deploy novo → usuário abre PWA instalado
        ↓
SW antigo intercepta navegação
        ↓
Devolve /index.html cacheado (hashes antigos)
        ↓
Browser pede /assets/index-OLDHASH.js → 404
        ↓
React nunca monta → spinner infinito do <div id="root"></div>
```

## Solução

Reescrever a estratégia do Service Worker para que o app:
- Sempre consiga renderizar HTML novo após um deploy
- Auto-cure caches inválidos detectando 404 em chunks
- Não bloqueie a primeira navegação esperando o precache
- Desregistre o SW dentro do preview/iframe do Lovable

### Etapas

1. **Reescrever `src/sw.ts`**
   - Manter `precacheAndRoute` mas **não** chamar `skipWaiting()` automaticamente no `install`. Em vez disso, escutar mensagem `SKIP_WAITING` vinda do cliente.
   - Trocar o `NavigationRoute` para `NetworkFirst` puro do Workbox (timeout 3s), **sem fallback para `/index.html` precacheado** — se a rede falhar, devolver `Response.error()` para o browser mostrar erro real em vez de um HTML quebrado.
   - Expandir denylist: `[/^\/~oauth/, /^\/api\//, /\.[a-f0-9]{8,}\.(js|css)$/]`.
   - No `activate`, limpar caches antigos do workbox cujo nome não bate com a revisão atual.

2. **Registrar SW manualmente em `src/main.tsx` com guards**
   - Não registrar quando `window.self !== window.top` (iframe Lovable).
   - Não registrar quando o hostname contém `lovableproject.com` ou `id-preview--`.
   - Em produção, registrar via `virtual:pwa-register` com `onNeedRefresh` que dispara um toast "Nova versão disponível — Atualizar agora" que chama `updateSW(true)`.
   - Em sandbox/preview, fazer `getRegistrations()` + `unregister()` + `caches.keys().delete(...)` para limpar resquícios.

3. **Substituir o `VersionChecker` atual**
   - Remover o polling de hash do `index.html` (não funciona quando o próprio HTML está cacheado).
   - Confiar no callback `onNeedRefresh` do `virtual:pwa-register`. Ele é o único caminho oficial: o Workbox dispara quando detecta novo SW em waiting state.
   - O botão "Atualizar agora" chama `updateSW(true)` → envia `SKIP_WAITING` → recarrega a página com SW novo já ativo.

4. **Adicionar auto-recuperação contra chunks 404 (`vite:preloadError`)**
   - Em `src/main.tsx`, escutar `window.addEventListener("vite:preloadError", ...)` e o evento `error` em `<script type="module">`.
   - Ao detectar, executar: desregistrar SW → limpar todos os caches → `location.reload(true)`. Usar uma `sessionStorage` flag para não entrar em loop infinito de reload.

5. **Adicionar fallback de detecção no `index.html`**
   - Inserir um script inline pequeno que, se após 15s o `#root` continuar vazio, força limpeza de SW + caches e reload uma única vez (com flag em sessionStorage). Isso resgata usuários que já estão com o SW antigo "envenenado" pela versão atual quebrada.

6. **Atualizar `vite.config.ts`**
   - Adicionar `devOptions: { enabled: false }` no `VitePWA` para não registrar SW em dev.
   - Manter `injectManifest` (já existe), garantir que `globPatterns` inclui todos os assets necessários.

7. **Manter o SW kill-switch como rede de segurança (opcional)**
   - Caso usuários reportem persistência do problema após o deploy do fix, publicar temporariamente um `public/sw.js` "kill-switch" (limpa caches e se desregistra) por 1 release para forçar limpeza universal.

### Arquivos alterados

```text
src/sw.ts                              (reescrito)
src/main.tsx                           (registro manual + guards + vite:preloadError)
src/components/layout/VersionChecker.tsx  (substituído pelo callback do PWA)
src/App.tsx                            (montar o novo toast de update, se necessário)
vite.config.ts                         (devOptions.enabled = false)
index.html                             (script inline de auto-recuperação 15s)
```

### Resultado esperado

- Deploy novo → usuário abre PWA → SW atual pega rede primeiro → recebe HTML novo com hashes novos → React monta normalmente. 
- Se o SW antigo já estava "envenenado", o script de auto-recuperação do `index.html` limpa caches e recarrega uma única vez automaticamente.
- Toast "Nova versão disponível" aparece de forma confiável via API oficial do Workbox.
- Em iframe/preview do Lovable, nenhum SW é registrado, evitando interferência durante desenvolvimento.

### Riscos e observações

- A primeira atualização após o deploy do fix ainda passa pelo SW antigo, então alguns usuários podem precisar do auto-reload de recuperação uma única vez. Depois disso, o problema não volta.
- O recurso de notificações push (`src/sw.ts` listener) continua funcionando — todo o bloco `push` / `notificationclick` é preservado na reescrita.
