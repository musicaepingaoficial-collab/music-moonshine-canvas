
# Plano: Snippets de rastreamento personalizados na aba Rastreamento

## Objetivo
Permitir que o super admin cadastre **vários trechos de código** (scripts/pixels de plataformas de UTM como Utmify, RedTrack, Hyros, etc.) e que esses trechos sejam **injetados automaticamente** em todas as páginas do site, no `<head>` ou no início do `<body>`, sem precisar editar `index.html`.

## O que vai mudar

### 1. Banco — nova tabela `tracking_snippets`
Cada snippet é uma linha independente, podendo ser ativado/desativado individualmente.

```text
tracking_snippets
├── id            uuid pk
├── name          text         (ex: "Utmify", "RedTrack pageview")
├── code          text         (HTML bruto: <script>...</script> ou <noscript><img.../></noscript>)
├── placement     text         ('head' | 'body_start')  default 'head'
├── enabled       boolean      default true
├── sort_order    int          default 0
├── created_at    timestamptz  default now()
└── updated_at    timestamptz  default now()
```

Políticas:
- `SELECT` público (anon + authenticated) apenas onde `enabled = true` — o site precisa ler para injetar.
- `INSERT/UPDATE/DELETE` somente para `admin` (via `has_role`).
- Grants padrão (`anon` SELECT, `authenticated` SELECT, `service_role` ALL).

### 2. Injeção no site — novo componente `TrackingSnippets`
Arquivo: `src/components/pixels/TrackingSnippets.tsx`.

- Faz `useQuery` em `tracking_snippets` (enabled=true, ordenado por `sort_order`).
- Para cada snippet, cria os elementos via DOM (`document.createElement`) e injeta:
  - `placement = 'head'` → `document.head.appendChild`
  - `placement = 'body_start'` → `document.body.prepend`
- Parse mínimo: extrai `<script>`/`<noscript>` do HTML; cria `<script>` real (necessário porque `innerHTML` não executa scripts) preservando `src`, `async`, atributos `data-*`, e `textContent` para scripts inline.
- Cleanup no unmount/refetch remove apenas os nós marcados com `data-tracking-snippet-id={id}` para evitar duplicação.
- Montado uma única vez em `src/App.tsx` ao lado do `PixelInjector` existente.

### 3. UI na aba Rastreamento
Atualizar `src/pages/admin/AdminRastreamentoPage.tsx` adicionando um novo Card **"Códigos de rastreamento (head / body)"** com:

- Lista de snippets cadastrados (nome, placement, on/off, editar, excluir).
- Botão **"Adicionar snippet"** abre um `Dialog` com:
  - `Input` — Nome (referência interna).
  - `Select` — Posição: `<head>` ou início do `<body>`.
  - `Textarea` (mono, altura grande) — Código HTML completo (cola o `<script>` que a plataforma fornece).
  - `Switch` — Ativo.
  - Botão Salvar.
- Aviso visível: *"Cole apenas códigos de fontes confiáveis. Eles serão executados em todas as páginas do site."*
- Reordenação simples por setas ↑↓ (atualiza `sort_order`).

### 4. Hook de dados
Novo `src/hooks/useTrackingSnippets.ts` com:
- `useTrackingSnippets()` — admin: lista todos.
- `usePublicTrackingSnippets()` — público: só `enabled=true`, usado pelo `TrackingSnippets` injetor.
- Mutations: `useCreateSnippet`, `useUpdateSnippet`, `useDeleteSnippet`, `useReorderSnippet`.

## Detalhes técnicos

- **Por que DOM e não `dangerouslySetInnerHTML`:** o React não executa `<script>` injetado via innerHTML. Precisamos criar o elemento `<script>` programaticamente.
- **Parser:** usar `DOMParser` em `text/html`, percorrer `doc.head` + `doc.body`, recriar `<script>`/`<noscript>`/`<meta>`/`<link>` clonando atributos e `textContent`.
- **Sem mexer no `index.html`** — tudo dinâmico via banco.
- **Performance:** os snippets carregam após hidratação. Para pixels que precisam disparar pageview imediato isso é suficiente (mesmo padrão do `PixelInjector` atual).
- **Migração SQL** seguindo a regra: `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`.

## Arquivos

Novos:
- `supabase/migrations/<timestamp>_tracking_snippets.sql`
- `src/hooks/useTrackingSnippets.ts`
- `src/components/pixels/TrackingSnippets.tsx`
- `src/components/admin/TrackingSnippetDialog.tsx`

Alterados:
- `src/App.tsx` — montar `<TrackingSnippets />`.
- `src/pages/admin/AdminRastreamentoPage.tsx` — novo card de gerenciamento.

## Validação
1. Cadastrar um `<script>console.log('utm-ok')</script>` em head → recarregar qualquer página pública → log aparece no console.
2. Desativar o snippet → recarregar → log some.
3. Cadastrar pixel real (ex: Utmify) → verificar requisições saindo na aba Network.
4. Excluir e confirmar que o nó injetado é removido.
5. Testar com placement `body_start` (ex: `<noscript><img>` de fallback).

Aprovando, eu implemento.
