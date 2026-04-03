

## Plano: Checkout Transparente do Mercado Pago

### Situação atual
O sistema redireciona o usuário para o checkout externo do Mercado Pago (`init_point`). Vamos substituir por um checkout transparente onde o pagamento é processado direto no site, com formulário de cartão nativo.

### Pré-requisito: Credenciais
O secret `MERCADO_PAGO_ACCESS_TOKEN` **não está configurado** no Supabase. Precisamos de:
1. **Public Key** (chave pública de produção) — vai no código frontend como `VITE_MP_PUBLIC_KEY` no `.env`
2. **Access Token** (chave privada de produção) — vai como secret do Supabase (`MERCADO_PAGO_ACCESS_TOKEN`)

Antes de implementar, vou solicitar ambas as credenciais via ferramenta de secrets.

---

### 1. Adicionar SDK do MercadoPago.js
- Adicionar `<script src="https://sdk.mercadopago.com/js/v2"></script>` no `index.html`
- Ou instalar `@mercadopago/sdk-react` como dependência npm

### 2. Novo componente `CheckoutForm`
- `src/components/subscription/CheckoutForm.tsx`
- Formulário com campos: nome no cartão, número, validade, CVV, CPF do titular, parcelas
- Usa o SDK do MP para tokenizar o cartão no frontend (nunca envia dados sensíveis ao nosso backend)
- Envia o `card_token`, `payment_method_id`, `installments`, `issuer_id` para a edge function

### 3. Refatorar edge function `create-payment`
- Em vez de criar preferência de checkout (`/checkout/preferences`), criar pagamento direto via `/v1/payments`
- Recebe: `card_token`, `payment_method_id`, `installments`, `issuer_id`, `plan`, `payer` (email, CPF, nome)
- Processa o pagamento e retorna status (`approved`, `pending`, `rejected`)
- Se aprovado, ativa a assinatura diretamente (sem depender do webhook)
- Mantém webhook como fallback para pagamentos pendentes que viram aprovados depois

### 4. Atualizar `SubscriptionDialog` e `OfertasPage`
- Ao clicar "Assinar", em vez de redirecionar, abre o `CheckoutForm` dentro do próprio Dialog/página
- Fluxo: Selecionar plano → Preencher cartão → Processar → Feedback (aprovado/rejeitado/pendente)
- Mostrar status do pagamento inline com feedback visual

### 5. Atualizar `paymentService.ts`
- Nova função `processTransparentPayment(data)` que envia token + dados ao edge function
- Remove/mantém `createPayment` como fallback opcional

### 6. Webhook `payment-webhook`
- Mantém como está para processar notificações assíncronas (pagamentos pendentes → aprovados)
- Sem alteração necessária

### 7. Tratamento de parcelas
- Edge function auxiliar ou endpoint que consulta `/v1/payment_methods/installments` do MP
- Frontend consulta parcelas disponíveis ao preencher o cartão

---

### Arquivos envolvidos
- `index.html` — adicionar SDK do MP
- `.env` — adicionar `VITE_MP_PUBLIC_KEY`
- `src/components/subscription/CheckoutForm.tsx` (novo)
- `src/components/subscription/SubscriptionDialog.tsx` (refatorar)
- `src/pages/OfertasPage.tsx` (refatorar)
- `src/services/paymentService.ts` (refatorar)
- `supabase/functions/create-payment/index.ts` (refatorar)
- Supabase secret: `MERCADO_PAGO_ACCESS_TOKEN` (adicionar)

### Fluxo do checkout transparente

```text
Usuário seleciona plano
        ↓
Abre formulário de cartão (CheckoutForm)
        ↓
SDK do MP tokeniza dados do cartão → card_token
        ↓
Frontend envia token + plano → edge function create-payment
        ↓
Edge function cria pagamento via /v1/payments
        ↓
Se approved → ativa assinatura + retorna sucesso
Se pending → salva referência + mostra "aguardando"
Se rejected → retorna erro + mostra mensagem
```

