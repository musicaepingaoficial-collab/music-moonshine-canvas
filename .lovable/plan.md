## Objetivo

Permitir que o admin cadastre um popup de boas-vindas (com grupos/promoções) que aparece para usuários logados conforme regras de público, e fica oculto após o usuário fechar.

## Modelo de dados

Nova tabela `welcome_popup` (singleton — apenas 1 registro ativo por vez):

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `active` | boolean | Liga/desliga o popup |
| `title` | text | Título exibido |
| `description` | text | Texto/descrição (multilinha) |
| `image_url` | text nullable | Imagem opcional (topo) |
| `links` | jsonb | Array `[{ label, url, icon? }]` para grupos/promoções |
| `show_to_new` | boolean | Exibir para usuários sem assinatura ativa / recém-cadastrados |
| `show_to_subscribers` | boolean | Exibir para assinantes ativos |
| `new_user_days` | integer | Considera "novo" usuários cadastrados há ≤ N dias (default 7) |
| `version` | integer | Incrementa a cada save no admin — força reaparecer se admin atualizar |
| `updated_at` | timestamptz | |

**RLS:**
- SELECT público (anon + authenticated) — necessário para o popup carregar.
- ALL apenas para admins (`has_role(auth.uid(), 'admin')`).

**Bucket de storage:** reutiliza `anuncios-images` (já público) para imagem do popup.

## Tela de admin

Nova página `src/pages/admin/AdminPopupPage.tsx` em `/admin/popup`:
- Toggle "Popup ativo".
- Inputs: título (max 120), descrição (textarea, max 1000), upload de imagem (preview + botão remover).
- Editor de **lista de links** (add/remover linhas): label (max 60) + URL (validar `https://`) + opcional ícone (select: WhatsApp, Telegram, Instagram, Link).
- Configuração de público: 2 switches (`show_to_new`, `show_to_subscribers`) + input numérico "considerar novo até X dias".
- Botão Salvar — incrementa `version` automaticamente.
- Pré-visualização do popup ao lado do formulário.

Adicionar entrada "Popup de Boas-vindas" no `AdminSidebar.tsx` e rota em `App.tsx` (dentro de `/admin`).

## Componente do popup (frontend do app)

Novo `src/components/popup/WelcomePopup.tsx`:
- Hook `useWelcomePopup()` que lê o registro via React Query (`welcome_popup`), cruza com `useAuth` + `useAssinatura`.
- Lógica de visibilidade:
  1. `active === true`.
  2. Usuário autenticado e está dentro de uma rota do `AppLayout` (não landing/login).
  3. Verifica audiência:
     - Se assinante ativo → mostra apenas se `show_to_subscribers`.
     - Senão → mostra apenas se `show_to_new` **e** (`profiles.created_at` ≤ `new_user_days` dias OU usuário sem assinatura, conforme as duas opções estarem ligadas — implementação: se `show_to_new` ligado, mostra a quem se enquadra; `new_user_days = 0` significa "qualquer não-assinante").
  4. Lê localStorage `welcome_popup_dismissed_v{version}_{userId}`. Se existir → não mostra. Quando admin atualiza, `version` muda e o popup reaparece.
- UI: usa `Dialog` do shadcn. Cabeçalho com imagem (se houver), título, descrição. Lista de links como botões grandes (ícone + label, abrem em nova aba com `rel="noreferrer"`). Botão "Fechar" no rodapé que grava o dismiss.
- Montar dentro de `AppLayout.tsx` para aparecer só nas rotas autenticadas.

## Validações

- Admin: zod schema (título obrigatório, max lengths, URLs válidas começando com `http(s)://`).
- Frontend: `encodeURI` não é necessário pois URLs são salvas pelo admin; apenas garantir `target="_blank" rel="noopener noreferrer"`.

## Arquivos

**Migration:** criar tabela `welcome_popup` + RLS + seed de 1 linha vazia (`active=false`).

**Novos**
- `src/pages/admin/AdminPopupPage.tsx`
- `src/components/popup/WelcomePopup.tsx`
- `src/hooks/useWelcomePopup.ts`

**Editados**
- `src/App.tsx` — rota `/admin/popup`.
- `src/components/layout/AdminSidebar.tsx` — item de menu.
- `src/components/layout/AppLayout.tsx` — montar `<WelcomePopup />`.
