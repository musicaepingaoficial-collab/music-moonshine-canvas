## Diagnóstico

Rodei o linter do Supabase + scanner de segurança + olhei os logs do console. Resumo:

### Bugs reais (devem ser corrigidos)
1. **Spam de logs `[useIsAdmin] Checking role for: …`** — o `console.log` dentro do `queryFn` está sendo chamado dezenas de vezes em pouco tempo. O hook tem cache de 5min, mas várias páginas montam/desmontam o componente. O log em si é desnecessário em produção e polui o console.
2. **`pdfs.file_path` lido por qualquer usuário autenticado** — finding "error" do scanner. Hoje qualquer usuário logado consegue `select file_path from pdfs`, mesmo sem ter comprado nem ser assinante. Embora o bucket `pdfs` seja privado, expor o caminho facilita ataques. Devemos restringir o SELECT do `file_path` (via view ou política).
3. **Findings desatualizados no scanner** (já foram corrigidos em rodadas anteriores mas seguem na lista):
   - `pixel_settings_access_token_exposure` → já migrado pra `pixel_settings_secrets`
   - `pending_subscriptions_pii_exposure` → já tem policy admin-only
   - `google_drives_no_select_policy` → já tem policy admin-only
   - `suppliers_no_select_policy` → já tem policy admin-only
   - `profiles_cpf_whatsapp_exposure` (INSERT) → handled pelo trigger `handle_new_user`
   → marcar como **fixed** no rastreador.
4. **Warnings do linter ainda abertos**:
   - 2x `SECURITY DEFINER` executável por usuários autenticados → identificar quais funções faltou `REVOKE EXECUTE` (provavelmente `check_profile_update`, `assign_admin_for_allowlisted_email`, `normalize_profile_email`, `handle_new_user`, `handle_updated_at`, `update_updated_at_column` — funções de trigger não precisam de EXECUTE público).
   - 4x **public bucket allows listing** → risco aceito (covers/imagens precisam ser listáveis), só registrar.
   - **Leaked Password Protection** → ação manual no Dashboard.
5. **Realtime em `active_sessions` sem policy em `realtime.messages`** → finding "error". Risco aceito anteriormente (precisamos do canal para o hook de sessão única), mas vale adicionar policy em `realtime.messages` filtrando por `topic = 'active_sessions:' || auth.uid()` para mitigar.

## Plano

### 1. Frontend
- **`src/hooks/useUser.ts`**: remover o `console.log("[useIsAdmin] Checking role for:", …)` e `console.error` virar log silencioso (manter só em caso de erro real). Mantém o fallback e o cache.

### 2. Migration SQL
- **REVOKE EXECUTE** em todas as funções `SECURITY DEFINER` que são triggers e não precisam ser chamáveis pelo cliente: `handle_new_user`, `handle_updated_at`, `update_updated_at_column`, `check_profile_update`, `assign_admin_for_allowlisted_email`, `normalize_profile_email`. (As funções `has_role` e `has_pdf_access` precisam continuar acessíveis pois são usadas em policies RLS.)
- **Proteger `pdfs.file_path`**:
   - Criar policy mais granular: usuários comuns só leem `pdfs` ativos *sem* o `file_path` (via column-level grant) — ou criar uma view pública `pdfs_public` sem `file_path` e mudar o frontend para consumir essa view.
   - Manter a tabela `pdfs` completa só para admins ou usuários com acesso (usar `has_pdf_access`).
- **Policy de Realtime para `active_sessions`** — criar policy em `realtime.messages` permitindo apenas tópicos do próprio usuário (mitiga o finding error).

### 3. Security memory + findings rastreados
- Marcar como **fixed** os 5 findings já resolvidos.
- Atualizar `mem://security-memory` (via tool) listando o que ficou como risco aceito (buckets públicos, Leaked Password manual, MFA admin manual, HMAC do webhook MP desativado a pedido do usuário).

### O que NÃO vou mexer
- HMAC do webhook MP (você pediu pra deixar desativado).
- MFA no Supabase Auth (manual).
- Leaked Password Protection (manual).
- Public buckets (risco aceito).

## Ações manuais que continuam pendentes (suas)
1. Ativar **Leaked Password Protection** no Dashboard Supabase → Auth → Passwords.
2. Ativar **MFA** nas 3 contas admin (rmoraes42@, robsonmoraesdesigner@, musicaepingaofical@).

Confirma para eu executar?
