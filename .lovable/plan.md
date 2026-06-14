# Plano: Página admin de Recuperação por Email

Página em `/admin/recuperacao` para configurar a campanha, ver quem vai receber, e acompanhar enviados / abertos / convertidos.

---

## 1. Banco

### 1.1 Tabela `recovery_campaign_config` (singleton)
Configuração editável da campanha (1 linha única, `id = 'default'`):

- `enabled` (bool) — liga/desliga o cron
- `step1_subject`, `step1_html`
- `step2_subject`, `step2_html`, `step2_cupom` (default `VOLTA20`)
- `step3_subject`, `step3_html`, `step3_cupom` (default `ULTIMA40`)
- `step2_delay_days` (default 3)
- `step3_delay_days` (default 4)
- `batch_limit` (default 100)
- `updated_at`, `updated_by`

RLS: somente admin lê/escreve. Seed com os textos atuais do edge function.

### 1.2 Tabela `recovery_email_events`
Rastreio de aberturas e conversões:

- `log_id` (FK → `recovery_campaign_log.id`)
- `event_type` (`open` | `convert`)
- `occurred_at`
- `user_agent`, `ip` (apenas para `open`)

RLS: admin lê; service_role escreve.

### 1.3 Ajustes em `recovery_campaign_log`
Adicionar `opened_at timestamptz` e `converted_at timestamptz` (denormalizados pra leitura rápida em listas).

---

## 2. Tracking pixel (abertura)

Nova edge function pública **`track-email-open`**:

- Rota: `GET /track-email-open?lid={log_id}`
- Retorna PNG 1x1 transparente.
- Insere em `recovery_email_events` (type `open`) e atualiza `recovery_campaign_log.opened_at` se ainda nulo.
- Inclui headers anti-cache.

No HTML de cada email, injetar no final:
```html
<img src="{SITE}/functions/v1/track-email-open?lid={LOG_ID}" width="1" height="1" />
```

Para isso o edge function `send-recovery-emails` passa a:
1. INSERT no log **antes** de enviar (status `pending`), pegando o `id`
2. Injetar o pixel com esse `id` no HTML
3. UPDATE para `sent`/`failed` após o envio

---

## 3. Conversão

Considera-se "convertido" quando o usuário criou assinatura **após** receber qualquer email da campanha.

Job leve (executado pela própria função admin ou no início do cron diário):

```sql
UPDATE recovery_campaign_log l
SET converted_at = a.created_at
FROM assinaturas a
WHERE a.user_id = l.user_id
  AND a.created_at > l.sent_at
  AND l.converted_at IS NULL;
```

Também registra `event_type = 'convert'` em `recovery_email_events`.

Bonus: detectar conversão atribuída a cupom — se a assinatura usou `VOLTA20`/`ULTIMA40`, marcar como "atribuição forte".

---

## 4. Edge function admin `recovery-campaign-admin`

Endpoints (com verificação de role admin via JWT):

- `GET /stats` → totais por step: elegíveis, enviados, abertos, convertidos, taxa de abertura, taxa de conversão.
- `GET /recipients?step=&status=&q=&page=` → lista paginada de quem recebeu/vai receber, com nome, email, step, status, sent_at, opened_at, converted_at.
- `GET /eligible-preview` → quem entra na próxima execução (step + motivo).
- `POST /run-now` → dispara `send-recovery-emails` imediatamente.
- `POST /config` → atualiza `recovery_campaign_config`.
- `POST /send-test` → envia um email de teste do step X para email informado.

---

## 5. Frontend — `/admin/recuperacao`

Página com 4 abas:

### Aba "Visão geral"
- Cards: Elegíveis hoje, Enviados (total), Abertos, Convertidos, Receita estimada
- Por step (1, 2, 3): tabela com Enviados / Abertos (%) / Convertidos (%)
- Gráfico de envios por dia (últimos 30 dias) — usando Recharts
- Botão **"Disparar agora"** + toggle **"Campanha ativa"**

### Aba "Configuração"
- Switch enabled
- Inputs de delay (dias entre steps), batch limit
- Para cada step: assunto + HTML (textarea com preview lado-a-lado) + cupom
- Botão "Salvar" e "Enviar teste pra mim"

### Aba "Destinatários"
- Filtros: step, status (sent/failed/opened/converted), busca por email/nome
- Tabela paginada com colunas: Nome, Email, Step, Enviado em, Aberto, Convertido em
- Export CSV

### Aba "Próximos envios"
- Lista quem entra na próxima rodada do cron, com motivo (ex: "Recebeu step 1 há 4 dias → vai receber step 2")

Componentes shadcn já no projeto: `Tabs`, `Card`, `Table`, `Switch`, `Button`, `Input`, `Textarea`, `Dialog`. Cores e estilo seguem o tema existente do admin.

### Roteamento
- Adicionar rota `/admin/recuperacao` em `App.tsx` dentro do `AdminRoute`.
- Adicionar link no `AdminSidebar` (item "Recuperação", ícone `MailWarning`).

---

## 6. Refatoração do `send-recovery-emails`

- Ler `recovery_campaign_config` no início; se `enabled = false` → retorna sem fazer nada.
- Usar `step2_delay_days` / `step3_delay_days` da config (em vez de hardcoded).
- Usar subject/HTML/cupom da config (templates editáveis).
- Inserir log **antes** do envio (status `pending`), injetar pixel com `log_id`, depois UPDATE para `sent`/`failed`.
- Rodar o UPDATE de conversão no início.

---

## 7. Arquivos previstos

**Migration (banco):**
- `recovery_campaign_config` + seed + RLS
- `recovery_email_events` + RLS
- ALTER em `recovery_campaign_log` (opened_at, converted_at)

**Edge functions (novas/editadas):**
- `supabase/functions/track-email-open/index.ts` (nova, pública)
- `supabase/functions/recovery-campaign-admin/index.ts` (nova, admin-only)
- `supabase/functions/send-recovery-emails/index.ts` (refatorada)

**Frontend:**
- `src/pages/admin/AdminRecuperacaoPage.tsx`
- `src/hooks/useRecoveryCampaign.ts` (React Query)
- Rota em `src/App.tsx`
- Item no `src/components/layout/AdminSidebar.tsx`

---

## 8. Limites conhecidos (transparência)

- **Aberturas** dependem do cliente de email carregar imagens. Apple Mail/Gmail fazem pré-carregamento (infla taxa); clientes que bloqueiam imagens não contam. É um proxy, não número exato — padrão de mercado.
- **Conversão** é por janela de tempo após envio + correlação com cupom; pode haver falso-positivo (usuário que ia assinar de qualquer forma) e falso-negativo (assinou de outro dispositivo sem clicar). Aceitável para campanha interna.

---

## Resultado

Admin abre `/admin/recuperacao`, edita textos e cupons sem precisar de código, vê em tempo real quem vai receber, quem recebeu, quem abriu e quem virou assinante — com botão pra disparar manualmente e desligar a campanha quando quiser.

Sigo com a implementação?
