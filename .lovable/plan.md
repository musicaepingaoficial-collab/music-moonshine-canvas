# Popup de Renovação Próxima do Vencimento

Mantém pagamento avulso e adiciona aviso visual conforme o plano se aproxima do fim, com botão "Renovar agora" que abre o checkout.

## Como vai funcionar (visão do usuário)

Quando o usuário logado tem uma assinatura ativa prestes a vencer, um popup aparece no app:

- **7 dias antes** — Popup amarelo: "Seu plano vence em 7 dias"
- **5 dias antes** — Popup laranja: "Faltam 5 dias para seu plano vencer"
- **3 dias antes** — Popup laranja forte: "Apenas 3 dias restantes"
- **1 dia antes** — Popup vermelho: "Seu plano vence amanhã!"

Cada popup tem:
- Mensagem clara com dias restantes
- Botão grande **"Renovar agora"** → abre o dialog de checkout (mesmo fluxo do `SubscriptionDialog`)
- Botão secundário **"Lembrar depois"** → fecha por 24h

Regra: o popup de cada marco aparece **uma vez por dia** (não fica perturbando a cada navegação). Se o usuário já clicou em "Lembrar depois" hoje, só volta amanhã.

## Implementação técnica

### 1. Hook `useRenewalReminder`
Novo arquivo `src/hooks/useRenewalReminder.ts`:
- Lê assinatura ativa do usuário (já existe via `getSubscriptionStatus`)
- Ignora plano `vitalicio` (sem `expires_at`)
- Calcula `daysLeft = ceil((expires_at - now) / 86400000)`
- Define `milestone` se `daysLeft ∈ {7,5,3,1}`
- Verifica `localStorage` chave `renewal_reminder_dismissed_{milestone}_{YYYY-MM-DD}` para não repetir no mesmo dia
- Retorna `{ show, daysLeft, milestone, dismiss(), openCheckout() }`

### 2. Componente `RenewalReminderDialog`
Novo `src/components/subscription/RenewalReminderDialog.tsx`:
- Usa `Dialog` do shadcn
- Variantes de cor por `milestone` (7=amarelo, 5=laranja, 3=laranja-forte, 1=vermelho via tokens semânticos do `index.css`)
- Ícone `Clock` / `AlertTriangle` (lucide-react)
- Texto dinâmico por marco
- Botão primário "Renovar agora" → fecha e abre `SubscriptionDialog` já existente
- Botão "Lembrar depois" → grava dismissal no localStorage

### 3. Integração no `AppLayout`
Em `src/components/layout/AppLayout.tsx`:
- Adicionar `<RenewalReminderDialog />` no final
- O componente se auto-controla via hook (sem props)

### 4. Reaproveitamento
Reusa o `SubscriptionDialog` existente para o checkout — zero código novo de pagamento.

## Arquivos afetados

- **Novo:** `src/hooks/useRenewalReminder.ts`
- **Novo:** `src/components/subscription/RenewalReminderDialog.tsx`
- **Editado:** `src/components/layout/AppLayout.tsx` (1 import + 1 linha JSX)

## Fora do escopo

- Nenhuma mudança em edge function, banco ou Mercado Pago
- Sem e-mail/push (já existe campanha de recuperação separada)
- Sem cobrança automática (continua avulso)

Posso implementar?
