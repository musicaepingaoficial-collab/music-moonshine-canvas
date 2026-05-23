# Plano de Correções de Segurança — Música e Pinga

Decisões confirmadas:
- Webhook MP com HMAC → solicitar secret `MP_WEBHOOK_SECRET`.
- Anti-enumeração de e-mail → rate-limit por IP (sem captcha).
- CORS restrito a `https://musicaepinga.shop` (+ preview Lovable).
- Executar **Fase 1, 2 e 3** em sequência.

> Observação: o backend Lovable não tem primitivos oficiais de rate-limit; faremos uma implementação ad-hoc com tabela `rate_limits` (janela deslizante por IP).

---

## FASE 1 — Críticas

### 1.1 Separar tokens de pixels (migração SQL)
- Criar tabela `pixel_settings_secrets` (admin-only RLS): `meta_access_token`, `tiktok_access_token`, `kwai_access_token`.
- Remover essas 3 colunas de `pixel_settings` (manter IDs e flags, leitura pública continua).
- Atualizar `meta-capi/index.ts` para buscar token via service role na nova tabela.
- `PixelInjector.tsx` e `pixels.ts` não mudam (já só usam IDs/flags).
- Criar UI admin para gravar/atualizar `pixel_settings_secrets` (extensão da tela existente).

### 1.2 Verificação HMAC no `payment-webhook`
- Validar `x-signature` (`ts=...,v1=...`) e `x-request-id` com `MP_WEBHOOK_SECRET` antes de processar.
- Rejeitar 401 se assinatura inválida ou `ts` com mais de 5 min de desvio.

### 1.3 Realtime + `pending_subscriptions` + Active sessions
- Remover `active_sessions` do publication `supabase_realtime` (`ALTER PUBLICATION ... DROP TABLE`).
- Adicionar policy explícita em `pending_subscriptions`: somente admins fazem SELECT/UPDATE/DELETE (INSERT só via service role).
- Adicionar `expires_at` (default `now() + 7 days`) e índice em `claim_token`.

### 1.4 Anti-enumeração em `check-email-exists`
- Criar tabela `rate_limits (key text, window_start timestamptz, count int)`.
- Bloquear se mais de 10 chamadas/IP em 1 min.
- Manter retorno honesto somente para uso interno autenticado; chamadas anônimas recebem sempre `{ ok: true }`.

---

## FASE 2 — Altas

### 2.1 REVOKE EXECUTE em DEFINER internas
```sql
REVOKE EXECUTE ON FUNCTION public.handle_new_user, public.assign_admin_for_allowlisted_email, public.check_profile_update FROM PUBLIC, authenticated, anon;
```

### 2.2 Tabela `admin_allowlist`
- Criar tabela admin-only com `email text PK`.
- Migrar a função `assign_admin_for_allowlisted_email` para consultá-la (mantendo os 3 e-mails atuais).
- Avisar usuário para ativar MFA nesses e-mails no painel Supabase.

### 2.3 Buckets sem LIST
- Criar policies em `storage.objects` para `repertorio-covers`, `pdf-covers`, `anuncios-images`, `discografias` permitindo SELECT só por nome conhecido (negando LIST sem prefixo).

### 2.4 SELECT explícitos
- Adicionar `Admins can read suppliers` e `Admins can read google_drives`.

### 2.5 Leaked Password Protection
- Instrução ao usuário: Supabase Dashboard → Auth → Passwords → ativar.

---

## FASE 3 — Médias / Hardening

### 3.1 CORS restrito
Criar helper `_shared/cors.ts` retornando origem dinâmica entre:
- `https://musicaepinga.shop`
- `https://*.lovableproject.com` (preview)
Aplicar em **todas** as edge functions (substituir o `*` atual).

### 3.2 CSP / Headers de segurança
Adicionar em `index.html`:
- `<meta http-equiv="Content-Security-Policy" ...>` (script/style/img/connect liberando Supabase, Meta, Google, TikTok, Kwai).
- `<meta http-equiv="X-Frame-Options" content="DENY">`
- `<meta name="referrer" content="strict-origin-when-cross-origin">`

### 3.3 Validação Zod nas edge functions
Adicionar schemas em: `create-payment`, `create-pdf-payment`, `claim-pending-subscription`, `delete-user-account`, `export-user-data`, `affiliates`, `send-email`, `send-admin-push`.

### 3.4 Rate-limit ad-hoc (IP) em
`create-payment`, `create-pdf-payment`, `send-email`, `check-email-exists` (já feito na fase 1), usando a tabela `rate_limits`.

### 3.5 Senha mínima 8 + 1 letra + 1 número
Atualizar `claim-pending-subscription` e validações cliente em `LoginPage`, `FinalizarCadastroPage`.

### 3.6 Sanitização de logs
Criar `_shared/logger.ts` que remove campos `authorization`, `token`, `cpf`, `password` antes do `console.error`.

### 3.7 Forçar e-mail lowercase
Trigger BEFORE INSERT/UPDATE em `profiles` aplicando `lower(email)`.

---

## Ordem de execução

1. **Migração SQL única** cobrindo 1.1, 1.3, 2.1, 2.2, 2.3, 2.4, 3.7 + tabela `rate_limits`.
2. **Pedir secret** `MP_WEBHOOK_SECRET`.
3. Edits em todas as edge functions (HMAC, CORS, Zod, logger, rate-limit).
4. Edits client-side (CSP, senha mínima, UI admin para tokens secretos).
5. Avisar usuário das ações manuais: ativar Leaked Password Protection, ativar MFA nos 3 admins, configurar webhook secret no Mercado Pago.

Pronto para iniciar Fase 1 assim que aprovado.
