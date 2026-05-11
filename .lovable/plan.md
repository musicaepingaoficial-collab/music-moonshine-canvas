## Objetivo

Permitir apenas **uma sessão ativa por conta**. Quando o usuário fizer login em outro dispositivo/navegador, a sessão anterior deve ser deslogada automaticamente.

## Como funciona

Supabase permite múltiplas sessões simultâneas por padrão. Para forçar sessão única, vamos:

1. Registrar a sessão "ativa" do usuário em uma tabela no banco a cada login.
2. Cada cliente (aba/navegador) escuta mudanças nessa tabela em tempo real (Supabase Realtime).
3. Se o `session_id` registrado no banco for diferente do `session_id` local, o cliente faz `signOut()` e mostra um aviso: *"Sua conta foi acessada em outro dispositivo."*

## Implementação técnica

### 1. Banco de dados (migração)

Nova tabela `active_sessions`:
- `user_id` (uuid, PK) — uma linha por usuário
- `session_id` (text) — identificador único gerado no cliente a cada login
- `device_info` (text, opcional) — user agent
- `updated_at` (timestamptz)

RLS:
- SELECT: usuário vê apenas a própria linha
- INSERT/UPDATE: usuário só pode escrever a própria linha (`user_id = auth.uid()`)

Habilitar Realtime (`replica identity full` + adicionar à publicação `supabase_realtime`).

### 2. Frontend — novo hook `useSingleSession`

Criado em `src/hooks/useSingleSession.ts` e chamado uma vez no `App.tsx` (ou no `ProtectedRoute`):

- Ao detectar usuário logado:
  1. Gera um `sessionId` (uuid) e guarda em `localStorage` (chave `mp_session_id`).
  2. Faz `upsert` na tabela `active_sessions` com esse `sessionId`.
  3. Abre canal Realtime escutando `UPDATE` na própria linha.
  4. Quando recebe um update com `session_id ≠ sessionId local`, chama `supabase.auth.signOut()`, limpa `localStorage` e mostra toast: *"Você foi desconectado porque sua conta foi acessada em outro dispositivo."*
- Ao fazer logout: remove `mp_session_id` do localStorage.

### 3. Considerações

- **Admins**: aplicar a mesma regra (sem exceção), salvo se você quiser excluir admins — me avise.
- **PWA / refresh de token**: o `session_id` persiste no localStorage e só muda em novo login, então refreshes de token não disparam logout.
- **Reconexão Realtime**: ao reconectar, o hook refaz a checagem comparando o valor atual do banco com o local.

## Arquivos afetados

- **Migração SQL** (nova tabela + RLS + realtime).
- `src/hooks/useSingleSession.ts` (novo).
- `src/App.tsx` (montar o hook após auth).
- `src/pages/LoginPage.tsx` (gerar/salvar `session_id` após login bem-sucedido — alternativamente o hook cobre isso sozinho ao detectar o `SIGNED_IN`).

## Confirmação

Posso prosseguir? Se quiser excluir admins dessa regra, me diga antes.
