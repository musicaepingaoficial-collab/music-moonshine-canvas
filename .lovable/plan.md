# Plano: Exclusão de assinaturas e usuários no painel admin

## Objetivo
Permitir que o super admin exclua:
1. **Assinaturas** de um usuário (cancelar/remover) em `/admin/assinaturas`
2. **Usuários inteiros** (conta auth + dados) em `/admin/usuarios`

---

## 1. Excluir assinaturas (`AdminAssinaturasPage`)

### UI
- Adicionar coluna **Ações** na tabela de assinaturas
- Botão de lixeira por linha → abre `AlertDialog` de confirmação
- Mostra plano, usuário e valor antes de confirmar
- Toast de sucesso/erro

### Lógica
- Mutation usando `supabase.from("assinaturas").delete().eq("id", id)`
- RLS já permite (`Admins can manage assinaturas` cobre DELETE via policy ALL)
- Invalidar queries: `admin-assinaturas`, `admin-users`, `assinatura`

### Opção extra (recomendada)
- Adicionar também botão **"Cancelar"** (soft) que apenas faz `update status='cancelled'` — preserva histórico financeiro
- Dois botões: **Cancelar** (soft, padrão) e **Excluir** (hard, destrutivo)

---

## 2. Excluir usuários (`AdminUsuariosPage`)

Exclusão de usuário é sensível: precisa apagar do `auth.users` (só via Service Role) + limpar dados. **Não dá para fazer só pelo client.**

### Edge function nova: `admin-delete-user`
Arquivo: `supabase/functions/admin-delete-user/index.ts`

Fluxo:
1. Valida JWT do chamador via `supabase.auth.getClaims()`
2. Checa `has_role(caller_id, 'admin')` — se não, 403
3. Recebe `{ target_user_id: string }` validado com Zod
4. Bloqueia auto-exclusão (`target_user_id !== caller_id`)
5. Usa client com `SUPABASE_SERVICE_ROLE_KEY` para:
   - Apagar dados dependentes (favoritos, downloads, repertorios, repertorio_musicas, active_sessions, admin_push_subscriptions, afiliados, assinaturas, indicacoes nullified, user_roles, profiles)
   - `admin.auth.admin.deleteUser(target_user_id)`
6. Registrar em `admin_access_logs` (action: `delete_user`)
7. Retorna `{ ok: true }`

Reutiliza a lógica já existente em `delete-user-account` (self-delete) — copiar e adaptar para receber `target_user_id` do admin em vez de pegar do JWT.

### UI em `AdminUsuariosPage`
- Nova coluna **Ações** com botão lixeira vermelho
- `AlertDialog` de confirmação com:
  - Nome + e-mail do usuário
  - Aviso de irreversibilidade
  - Campo de digitação `EXCLUIR` para destravar o botão (proteção)
- Mutation chama `supabase.functions.invoke('admin-delete-user', { body: { target_user_id }})`
- Invalida `admin-users`

### config.toml
Adicionar entrada para `admin-delete-user` (verify_jwt = false, validação feita no código)

---

## 3. Considerações de segurança
- DELETE de assinaturas continua só via RLS admin
- Edge function valida role server-side (não confia no client)
- Auto-exclusão bloqueada para impedir admin se trancar fora
- Todas as exclusões logadas em `admin_access_logs`

---

## Arquivos a alterar/criar

**Criar:**
- `supabase/functions/admin-delete-user/index.ts`

**Editar:**
- `src/pages/admin/AdminAssinaturasPage.tsx` (botões cancelar/excluir)
- `src/pages/admin/AdminUsuariosPage.tsx` (botão excluir usuário + dialog)
- `supabase/config.toml` (registrar nova função)

**Sem migration de banco necessária** — RLS de `assinaturas` já cobre admin, e a função usa service role para deletar do `auth.users`.

---

## Ordem de implementação
1. Edge function `admin-delete-user`
2. UI de excluir assinatura (mais simples, valida fluxo)
3. UI de excluir usuário com dialog de confirmação forte
4. Testar ambos os fluxos
