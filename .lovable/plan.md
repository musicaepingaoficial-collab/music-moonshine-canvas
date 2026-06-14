# Plano: Campanha de recuperação por email para usuários free

## Objetivo

Enviar uma sequência de 3 emails, em dias diferentes, para todos os usuários cadastrados que **nunca assinaram nenhum plano** (sem registro em `assinaturas` com `status = 'active'`), oferecendo descontos progressivos para incentivar a assinatura.

---

## 1. Identificar o público

Usuários elegíveis = usuários em `profiles` que:

- Não possuem nenhuma linha em `assinaturas` com `status IN ('active','superseded','expired')` (ou seja, nunca assinaram nada).
- Têm email válido em `profiles.email`.
- Não estão em `suppressed_emails` (bounce/complaint/unsubscribe).
- Não são admin (`user_roles` sem role `admin`).

Query de referência:

```sql
SELECT p.id, p.email, p.name, p.created_at
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM assinaturas a WHERE a.user_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = p.id AND r.role = 'admin')
  AND p.email IS NOT NULL;
```

---

## 2. Estratégia da sequência (3 emails)

| # | Quando enviar | Assunto | Conteúdo | Oferta |
|---|---|---|---|---|
| 1 | Dia 0 | "Sentimos sua falta no Música e Pinga 🎵" | Lembrete do que ele perde sem assinar (acervo, downloads, repertórios). CTA "Ver planos". | Sem cupom — só apresentação |
| 2 | Dia 3 | "Liberamos 20% OFF só pra você voltar" | Reforça benefícios + prova social. CTA com cupom aplicado no link. | Cupom `VOLTA20` (20% OFF, 7 dias) |
| 3 | Dia 7 | "Última chance: 40% OFF expira em 24h" | Urgência + escassez. CTA cupom + contador. | Cupom `ULTIMA40` (40% OFF, 24h) |

Cada email respeita a regra: 1 trigger = 1 destinatário, com `idempotencyKey` único (`recovery-{step}-{user_id}`).

---

## 3. Infraestrutura técnica

### 3.1 Pré-requisitos
- Lovable Cloud já habilitado ✅
- Domínio de email configurado (verificar com `check_email_domain_status`).
- `setup_email_infra` + `scaffold_transactional_email` rodados.

### 3.2 Templates React Email
Criar em `supabase/functions/_shared/transactional-email-templates/`:

- `recovery-step-1.tsx` — apresentação
- `recovery-step-2.tsx` — 20% OFF
- `recovery-step-3.tsx` — 40% OFF última chance

Registrar todos em `registry.ts`. Visual seguindo a identidade (verde/escuro do app).

### 3.3 Cupons no banco
Inserir em `cupons` dois cupons reutilizáveis (`VOLTA20`, `ULTIMA40`) com `data_expiracao` futura e `uso_limite` adequado. Reaproveita o `couponService` que já existe.

### 3.4 Tabela de controle de envios
Nova tabela `recovery_campaign_log` para evitar duplicidade e permitir auditoria:

- `user_id`, `step` (1/2/3), `sent_at`, `status`, `email`
- UNIQUE (`user_id`, `step`)

Assim, mesmo se o cron rodar duas vezes, cada usuário recebe cada etapa apenas uma vez.

### 3.5 Edge Function `send-recovery-emails`
Função agendada que:

1. Para cada step (1, 2, 3) busca usuários elegíveis cuja "idade na campanha" bate com a regra:
   - Step 1: usuários nunca processados (entram na campanha hoje).
   - Step 2: usuários que receberam step 1 há 3 dias.
   - Step 3: usuários que receberam step 2 há 4 dias.
2. Filtra contra `suppressed_emails` e contra quem virou assinante no meio do caminho.
3. Invoca `send-transactional-email` por usuário com o template correto e `idempotencyKey`.
4. Registra resultado em `recovery_campaign_log`.
5. Processa em lotes (ex: 100 por execução) para respeitar throughput de ~120 emails/min.

### 3.6 Agendamento
`pg_cron` chamando a função diariamente (ex: 10:00 BRT):

```sql
select cron.schedule(
  'recovery-emails-daily',
  '0 13 * * *',
  $$ select net.http_post(
       url:='https://zsquzchwxnsuysfrlngt.supabase.co/functions/v1/send-recovery-emails',
       headers:='{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb
     ); $$
);
```

---

## 4. Conformidade e boas práticas

- Footer de unsubscribe é adicionado automaticamente pelo sistema de emails da Lovable.
- Respeitar `suppressed_emails` (já é feito pelo `send-transactional-email`).
- Não reenviar para quem já assinou: checar `assinaturas` no momento do envio de cada step.
- Não enviar para admins ou usuários de teste (allowlist).
- Cada email com `Preview` claro e assunto honesto (não clickbait) pra proteger reputação do domínio.

---

## 5. Painel admin (opcional, recomendado)

Página `/admin/recuperacao` simples:

- Total elegível, enviados por step, taxa de conversão (quantos viraram assinantes após receber).
- Botão "Disparar manualmente agora" (chama a edge function).
- Lista dos últimos envios via `recovery_campaign_log` + `email_send_log`.

---

## 6. Validação antes de ligar em produção

1. Rodar a query do público alvo e conferir o volume.
2. Enviar os 3 templates para um email de teste (admin) usando `previewData`.
3. Disparar a edge function com `LIMIT 1` para um usuário de teste real.
4. Conferir `email_send_log` (status `sent`) e o email recebido.
5. Só então ativar o `pg_cron`.

---

## Arquivos / mudanças previstas

**Banco (migration):**
- `cupons`: insert dos 2 cupons.
- Nova tabela `recovery_campaign_log` com GRANTs e RLS (apenas admin lê; service_role escreve).
- Cron job `recovery-emails-daily`.

**Edge Functions:**
- `supabase/functions/send-recovery-emails/index.ts` (nova).
- 3 templates em `_shared/transactional-email-templates/`.
- Update em `registry.ts`.

**Frontend (opcional):**
- `src/pages/admin/AdminRecuperacaoPage.tsx` + rota.

---

## Resultado esperado

Usuários free recebem 3 emails ao longo de ~7 dias com ofertas progressivas (apresentação → 20% → 40%), aumentando a chance de conversão sem afetar quem já é assinante e respeitando unsubscribe/bounces.

Quer que eu siga em frente e implemente tudo? Posso começar pela migration + templates, ou prefere revisar/ajustar alguma etapa (descontos, dias, copy) antes?
