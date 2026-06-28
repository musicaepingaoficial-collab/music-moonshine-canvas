## Objetivo
Criar uma Edge Function que recebe eventos do **Mercado Pago**, traduz para o formato esperado pela **Kiwify** (postback de venda aprovada/pendente/recusada) e reenvia para a URL de postback configurada pela plataforma de tracking (UTMfy, etc.) — tudo controlado por uma nova seção na página `/admin/rastreamento`.

---

## Arquitetura

```text
Mercado Pago ──webhook──▶ mp-to-kiwify-webhook (Edge Function)
                                │
                                │ 1. valida assinatura MP
                                │ 2. busca pagamento via API MP
                                │ 3. monta payload no formato Kiwify
                                │ 4. POST para destination_url (UTMfy/Kiwify)
                                │ 5. registra em kiwify_bridge_logs
                                ▼
                       UTMfy / plataforma destino
```

---

## Passo 1 — Tabela de configuração + logs

Criar duas tabelas via migration:

**`kiwify_bridge_config`** (linha única, só admin lê/edita)
- `id` (uuid pk), `enabled` (bool), `destination_url` (text — o endpoint Kiwify-like do UTMfy)
- `product_id` (text — ID do produto no formato Kiwify), `product_name` (text)
- `secret_token` (text — token que o UTMfy espera no payload, opcional)
- `forward_pending` (bool, default false), `forward_refused` (bool, default false)
- `created_at`, `updated_at`

**`kiwify_bridge_logs`** (auditoria — só admin lê)
- `id`, `mp_payment_id` (text), `mp_status` (text), `kiwify_status` (text)
- `destination_url`, `request_payload` (jsonb), `response_status` (int), `response_body` (text)
- `success` (bool), `error_message` (text), `created_at`

RLS: leitura/escrita só para `has_role(auth.uid(), 'admin')`. `service_role` full access para a Edge Function escrever logs.

---

## Passo 2 — Edge Function `mp-to-kiwify-webhook`

Arquivo: `supabase/functions/mp-to-kiwify-webhook/index.ts`. Configurada no `config.toml` com `verify_jwt = false` (Mercado Pago não envia JWT).

Fluxo:

1. Aceita `POST` com payload Mercado Pago (`{ action, data: { id } }`).
2. Valida `x-signature` + `x-request-id` usando `MP_WEBHOOK_SECRET` (já existe nos secrets).
3. Busca o pagamento real via `GET https://api.mercadopago.com/v1/payments/{id}` usando `MERCADO_PAGO_ACCESS_TOKEN`.
4. Lê `kiwify_bridge_config`. Se `enabled = false`, retorna 200 sem reenviar.
5. Mapeia status MP → Kiwify:
   - `approved` → `paid`
   - `pending` / `in_process` → `waiting_payment` (só envia se `forward_pending`)
   - `rejected` / `cancelled` → `refused` (só envia se `forward_refused`)
   - `refunded` / `charged_back` → `refunded` / `chargedback`
6. Monta payload no schema Kiwify (campos chave que UTMfy/Kiwify consomem):

```json
{
  "order_id": "<mp_payment_id>",
  "order_status": "paid",
  "product_id": "<config.product_id>",
  "product_name": "<config.product_name>",
  "payment_method": "pix|credit_card|boleto",
  "Customer": { "full_name": "...", "email": "...", "mobile": "...", "CPF": "..." },
  "Commissions": { "charge_amount": "29.90", "product_base_price": "29.90", "currency": "BRL" },
  "TrackingParameters": { "utm_source": "...", "utm_medium": "...", "utm_campaign": "...", "utm_content": "...", "utm_term": "..." },
  "webhook_event_type": "order_approved",
  "created_at": "<ISO>", "approved_date": "<ISO>"
}
```

UTMs e dados do cliente vêm do `external_reference` / `metadata` do pagamento MP (já populados pela função `create-payment`).

7. `POST` para `destination_url` com `Content-Type: application/json` e header `x-kiwify-signature` (HMAC-SHA1 do body com `secret_token`, se configurado — formato que Kiwify usa).
8. Grava sucesso/erro em `kiwify_bridge_logs`.
9. Retorna `200` sempre para o MP (evita reenvios infinitos), com `{ ok, forwarded, kiwify_status }`.

CORS padrão + tratamento de OPTIONS.

---

## Passo 3 — UI no Super Admin

Em `src/pages/admin/AdminRastreamentoPage.tsx`, adicionar novo card **"Bridge Mercado Pago → Kiwify"** abaixo do card de snippets:

Campos:
- Switch **Ativar bridge**
- Input **URL de destino (postback Kiwify-like)** — copiar da UTMfy
- Input **Product ID** + **Product Name** (o que será enviado no payload)
- Input **Secret token** (opcional — usado pra assinar o body)
- Switches **Encaminhar pendentes** / **Encaminhar recusados**
- Botão **Salvar**
- Bloco somente leitura com a **URL do webhook MP** (para o usuário colar no painel do Mercado Pago):
  `https://zsquzchwxnsuysfrlngt.supabase.co/functions/v1/mp-to-kiwify-webhook`
  — com botão Copiar.
- Botão **Testar envio** → chama a função com `?test=1` que dispara um evento fake.

Histórico (últimos 20 logs):
- Tabela com data, mp_payment_id, status MP → status Kiwify, sucesso (✓/✗), response_status, erro.
- Botão "Ver payload" abre dialog com `request_payload` formatado.

Hooks novos em `src/hooks/useKiwifyBridge.ts`:
- `useKiwifyBridgeConfig()` / `useUpdateKiwifyBridgeConfig()`
- `useKiwifyBridgeLogs(limit)`

---

## Passo 4 — Integração com o webhook existente do MP

O projeto já tem `supabase/functions/payment-webhook`. **Não substituir.** Duas opções (escolher uma na implementação):

- **A (recomendada — mais simples):** Configurar **dois** webhooks no painel do Mercado Pago, um para `payment-webhook` (lógica de assinatura) e outro para `mp-to-kiwify-webhook` (tracking). Total isolamento.
- **B:** No final do `payment-webhook` atual, fazer `fetch` interno para `mp-to-kiwify-webhook`. Mais acoplado, mas só um webhook configurado no MP.

Vamos com **A** — zero risco de quebrar o fluxo de pagamento.

---

## Passo 5 — Secrets

Tudo o que precisamos já existe (`MERCADO_PAGO_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`). Nenhum secret novo necessário — o `destination_url` e `secret_token` da Kiwify ficam na tabela de config (são por-instância e o admin precisa editar pela UI).

---

## Arquivos a criar/editar

**Criar:**
- migration: tabelas `kiwify_bridge_config` + `kiwify_bridge_logs` (com GRANTs e RLS)
- `supabase/functions/mp-to-kiwify-webhook/index.ts`
- `src/hooks/useKiwifyBridge.ts`
- `src/components/admin/KiwifyBridgeCard.tsx`
- `src/components/admin/KiwifyBridgeLogsTable.tsx`

**Editar:**
- `src/pages/admin/AdminRastreamentoPage.tsx` (montar o novo card)
- `supabase/config.toml` (declarar a função com `verify_jwt = false`)

---

## Validação

1. Salvar config no admin com URL de teste (ex.: `https://webhook.site/...`).
2. Clicar **Testar envio** → ver payload chegar em webhook.site no formato Kiwify.
3. Configurar URL real do UTMfy, marcar **Ativar**.
4. Fazer uma compra de teste (PIX ou cartão sandbox) → confirmar no histórico que o evento `paid` foi entregue com `response_status: 200`.
5. UTMfy deve mostrar a venda atribuída ao UTM correto.
