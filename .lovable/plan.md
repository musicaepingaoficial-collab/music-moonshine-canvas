## Objetivo

Inverter o fluxo de aquisição: hoje o usuário cria a conta antes de pagar; passaremos a coletar apenas os dados fiscais (nome, CPF, WhatsApp, e-mail) antes do pagamento, e só pedir a senha (criação efetiva da conta) **depois** que o pagamento for confirmado.

## Novo fluxo do usuário

```
Landing → escolhe plano
   ↓
[1] Modal "Seus dados" — Nome, CPF, WhatsApp, E-mail
   ↓ (verifica se e-mail já existe)
   ├─ Sim → redireciona para Login com retorno ao checkout do plano
   └─ Não → segue
   ↓
[2] Modal "Pagamento" — Cartão ou PIX (já com dados pré-preenchidos)
   ↓
[3a] Cartão aprovado na hora           [3b] PIX gerado
        ↓                                    ↓
                                        Tela de espera com QR Code
                                        (polling automático)
                                        + e-mail de backup com link
                                        para finalizar quando confirmar
        ↓                                    ↓
[4] Tela "Crie sua senha" (e-mail já travado)
   ↓
[5] Conta criada + assinatura vinculada → Dashboard
```

## Mudanças no backend

### 1. Nova tabela `pending_subscriptions`
Armazena pagamentos feitos antes da conta existir.

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| email | text (lower) | chave de vínculo |
| full_name, cpf, whatsapp | text | dados fiscais coletados |
| plan | text | slug do plano |
| price | numeric | |
| mp_payment_id | bigint | ID do Mercado Pago |
| status | text | `pending` / `approved` / `rejected` / `claimed` |
| claim_token | text | token único enviado por e-mail |
| created_at, approved_at, claimed_at | timestamptz | |

RLS: leitura/escrita apenas via service role (edge functions). Sem acesso direto do cliente.

### 2. Edge function `create-payment` (modificada)
- Aceita chamadas **sem JWT** quando recebe os dados completos do pagador.
- Cria registro em `pending_subscriptions` no lugar de vincular a `user_id`.
- Retorna `pending_id` além do resultado MP.

### 3. Edge function `payment-webhook` (modificada)
- Ao receber confirmação, atualiza `pending_subscriptions.status`.
- Se `approved`: gera `claim_token` e dispara e-mail transacional com link `/finalizar-cadastro?token=...&email=...` (backup caso o usuário tenha saído da tela).

### 4. Nova edge function `claim-pending-subscription`
- Recebe `pending_id` (ou `claim_token`) + dados do novo usuário.
- Verifica status `approved` e que e-mail bate.
- Cria usuário via Admin API (`auth.admin.createUser`) com senha definida, marca e-mail confirmado.
- Cria registro em `assinaturas` vinculado ao novo `user_id`.
- Marca `pending_subscriptions.status = claimed`.
- Retorna sessão (ou orienta frontend a fazer `signInWithPassword`).

### 5. Nova edge function `check-email-exists`
- Pública. Recebe e-mail, retorna `{ exists: boolean }` consultando `auth.users` via service role.
- Usada na etapa [1] para desviar usuários existentes ao login.

### 6. E-mail transacional (Lovable Emails)
- Template "Pagamento confirmado — finalize seu cadastro" com botão para `/finalizar-cadastro?token=...`.
- Requer infraestrutura de e-mail transacional habilitada no projeto.

## Mudanças no frontend

### `PublicCheckoutDialog.tsx` (refatorado)
Três etapas no mesmo modal:
1. **`form-fiscal`**: nome, CPF, WhatsApp, e-mail, aceite de termos. Botão "Continuar". Antes de avançar, chama `check-email-exists`. Se existir, mostra aviso e botão "Ir para login" (envia para `/login?redirect=/planos?plano={slug}`).
2. **`payment`**: reaproveita `CheckoutForm`, agora chamando o `create-payment` em modo anônimo. PIX mantém polling; quando aprovar, avança automaticamente para `set-password`.
3. **`set-password`**: campos senha + confirmar senha. Submete para `claim-pending-subscription` e, em sucesso, faz login e navega para `/dashboard`.

### Novo `FinalizarCadastroPage.tsx`
- Rota pública `/finalizar-cadastro`.
- Lê `token` e `email` da URL.
- Mostra a mesma tela "Crie sua senha" e finaliza pelo mesmo `claim-pending-subscription`.
- Útil quando o usuário fechou a aba antes do PIX confirmar.

### Login — retorno ao checkout
- `LoginPage` já aceita `?redirect=`. Após login, se `redirect` apontar para `/planos?plano=...`, abre o checkout direto naquele plano (passando o usuário pelo fluxo atual autenticado, sem a etapa de senha).

### Remoções
- Etapa de criação de conta dentro de `PublicCheckoutDialog` (linhas que chamam `supabase.auth.signUp` antes do pagamento).
- Tela `CompleteProfilePage` continua, mas só será atingida em casos antigos — não é mais parte do fluxo novo.

## Considerações importantes

- **Reembolso/PIX expirado**: registros `pending_subscriptions` com status diferente de `approved` após X horas são ignorados (não permitem claim). Sem alterações no MP em si.
- **Pagamento aprovado, usuário nunca volta**: o e-mail de backup garante que ele consegue finalizar a qualquer momento via link com token.
- **Segurança**: `claim_token` é gerado server-side, single-use, expira em 30 dias. `check-email-exists` retorna apenas booleano, sem enumerar dados.
- **Pixels/analytics**: eventos `purchase` continuam disparando no momento certo (aprovação), agora antes da existência da conta — `external_id` fica vazio nesse momento e é reenviado via CAPI após o claim.
- **Admin/allowlist**: o trigger `assign_admin_for_allowlisted_email` continua funcionando porque o usuário ainda é criado via `auth.admin.createUser`.

## Pré-requisito

Para o e-mail de backup, o projeto precisa ter o domínio de e-mail configurado e a infraestrutura de e-mails transacionais habilitada. Se ainda não estiver, pedirei para configurar o domínio antes (ou podemos lançar primeiro só com a tela de espera e adicionar o e-mail depois — me avise se preferir essa entrega em duas fases).
