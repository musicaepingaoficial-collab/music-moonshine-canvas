## Objetivo
Centralizar 100% dos códigos de rastreamento no painel Super Admin (tabela `tracking_snippets`), removendo qualquer script hardcoded do `index.html` e garantindo que o injetor dinâmico não duplique tags ao remontar.

---

## Passo 1 — Limpar `index.html`

Remover o bloco de scripts UTMfy + Kwai Pixel que está hoje no `<head>` (linhas ~45-60):

- `<!-- UTMfy Tracking Script -->` e a tag `<script src="https://cdn.utmify.com.br/scripts/utms/latest.js" ...>`
- `<!-- Kwai Pixel Script via UTMfy -->` e todo o bloco `<script>` que define `window.kwaiPixelId` e injeta `pixel-kwai.js`

Manter no `<head>` apenas: meta tags, título, descrição, PWA, preconnect, OG/Twitter e o `<script type="module" src="/src/main.tsx">` no `<body>`.

Resultado: o `index.html` fica neutro; toda configuração de pixel passa a vir do banco.

---

## Passo 2 — Cadastrar o Super Pixel no Super Admin

No painel `/admin/rastreamento` → card **Códigos de rastreamento (head / body)**:

1. Clicar em **Adicionar snippet**.
2. Nome: `Super Pixel UTMfy` (ou o nome que preferir).
3. Posição: **`<head>`**.
4. Código: colar exatamente o snippet fornecido pela UTMfy/Super Pixel (incluindo as duas `<script>` tags se houver).
5. Ativar (`enabled = true`) e salvar.

A partir daí o componente `TrackingSnippets` injeta automaticamente em todas as páginas públicas.

---

## Passo 3 — Blindar `TrackingSnippets.tsx` contra dupla injeção

Hoje o componente já remove nós com `data-tracking-snippet-id` antes de injetar, mas em StrictMode / refetch isso pode rodar duas vezes em sequência. Reforçar com uma checagem de idempotência por `id` do snippet **antes** de criar os elementos:

```ts
// dentro do useEffect, antes de injetar:
const alreadyInjected = document.querySelector(
  `[${MARKER_ATTR}="${s.id}"]`
);
if (alreadyInjected) continue;
```

E manter a limpeza no `return` do `useEffect` (já existente) para evitar duplicação em hot-reload.

Opcionalmente, copiar também o atributo `id` original do `<script>` do usuário caso ele tenha definido um — assim scripts de terceiros que checam `getElementById` funcionam.

---

## Arquivos afetados

- `index.html` — remover bloco UTMfy/Kwai
- `src/components/pixels/TrackingSnippets.tsx` — adicionar guarda de idempotência por `snippet.id`

Nenhuma mudança de banco, RLS ou edge function é necessária — a tabela `tracking_snippets` e o card de admin já existem e funcionam.

---

## Validação

1. Após salvar, recarregar o site público em aba anônima (sem adblock).
2. No DevTools → Elements, confirmar no `<head>` a presença de `<script data-tracking-snippet-id="...">` apontando para o Super Pixel.
3. Console: verificar que o pixel inicializa sem 404 e que `Tracker.inited` vira `true`.
4. Network: confirmar requisições saindo para o domínio do Super Pixel.
