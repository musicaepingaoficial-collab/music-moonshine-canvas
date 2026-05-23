## Objetivo
Desativar a validação HMAC do webhook do Mercado Pago (que exige o `MP_WEBHOOK_SECRET` configurado no painel do MP) e remover a edge function temporária criada para revelar o segredo. O webhook volta a funcionar como antes, sem chave secreta.

## Mudanças

### 1. `supabase/functions/payment-webhook/index.ts`
- Remover o bloco de validação de assinatura HMAC (`x-signature` / `x-request-id`).
- Voltar a processar a notificação direto, como estava antes da auditoria.
- Manter os demais comportamentos (idempotência, atualização de `pending_subscriptions`, criação de assinatura, etc).

### 2. `supabase/functions/reveal-mp-secret/`
- Apagar a pasta e remover a função do deploy do Supabase.

### 3. Secret `MP_WEBHOOK_SECRET`
- Permanece salvo (não atrapalha em nada). Se preferir, posso também excluir — me avise.

### 4. Memória de segurança
- Registrar que a validação HMAC do webhook MP foi **risco aceito** a pedido do usuário (notificações forjadas continuam possíveis se alguém descobrir o ID do pagamento). Mitigação parcial: já consultamos o MP via API com o `MERCADO_PAGO_ACCESS_TOKEN` para confirmar o status do pagamento antes de aprovar — então um atacante precisaria de um `payment_id` real e aprovado.

## O que NÃO muda
- `MERCADO_PAGO_ACCESS_TOKEN` segue ativo.
- Geração de PIX, criação de pagamento, fluxo de checkout e claim de assinatura permanecem iguais.
- Demais hardenings da auditoria (rate-limit, anti-enumeração, tokens de pixel separados, senha forte, etc.) permanecem.

## Risco aceito
Sem HMAC, alguém que conheça a URL do webhook pode tentar enviar notificações falsas. A consulta ao MP via API com seu access token (que valida o `payment_id` retornado) é a única barreira restante — é razoável para o seu caso, mas fica registrado.
