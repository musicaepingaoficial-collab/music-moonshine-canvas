## Programa de Indicações — "Indique e Ganhe"

Implementar um banner no menu/dashboard principal mostrando o programa: cada amigo que assinar qualquer plano dá **1 mês grátis** ao indicador, e ao atingir **10 indicações premiadas** o usuário ganha **acesso vitalício**.

### O que o usuário verá

- **Dashboard**: banner em destaque "Indique amigos e ganhe 1 mês grátis. 10 indicações = vitalício!", com progresso (ex.: `3 / 10 indicações`) e botão "Ver meu link".
- **Página `/indicacoes`** (nova): link/código do usuário, botão copiar e compartilhar (WhatsApp), barra de progresso até 10, lista das indicações (pendente / premiada) e tabela de recompensas já concedidas.
- Item "Indicações" no menu lateral.

### Regras de recompensa (lado servidor)

Quando uma indicação muda para `rewarded` (pagamento aprovado do indicado), o sistema concede automaticamente:

```text
indicacoes_rewarded == 10 → assinatura "vitalicio" ativa, sem expiração
indicacoes_rewarded <  10 → +30 dias na assinatura ativa
                            (se não houver assinatura ativa, cria uma de 30 dias no plano "mensal")
```

A trava antiga de "máximo 3 bônus" é removida — agora o teto é 10 (após isso vira vitalício e indicações extras não geram mais bônus).

### Mudanças técnicas

1. **`supabase/functions/affiliates/index.ts`**
   - Remover o limite de 3 indicações premiadas no `register-referral` (deixa registrar sempre que o indicado ainda não foi referenciado).
   - Manter geração de código e bloqueio de auto-indicação.

2. **`supabase/functions/payment-webhook/index.ts`**
   - Ao marcar uma `indicacao` como `rewarded`, executar lógica de recompensa para o **dono do afiliado** (`afiliado.user_id`):
     - Recontar `rewarded` após o update.
     - Se contagem == 10 → `INSERT` em `assinaturas` com `plan='vitalicio'`, `status='active'`, `expires_at=NULL` (e marca demais assinaturas ativas como `superseded`).
     - Se contagem < 10 → estender em 30 dias a assinatura ativa do indicador (ou criar uma nova de 30 dias).
   - Inserir `notificacoes` para o usuário ("Você ganhou 1 mês grátis!" / "Parabéns! Acesso vitalício desbloqueado").

3. **Frontend**
   - `src/components/referrals/ReferralBanner.tsx` (novo): card destacado com gradiente, ícone, progresso `X/10` e CTA → `/indicacoes`.
   - `src/pages/IndicacoesPage.tsx` (nova): usa `useAfiliado`, `useIndicacoes`, `useGenerateAffiliateLink`. Mostra link `https://<host>/auth?ref=CODE`, botão copiar, share WhatsApp, progresso, lista.
   - `src/pages/DashboardPage.tsx`: incluir `<ReferralBanner />` logo após o `Banner` de boas-vindas.
   - `src/components/layout/AppSidebar.tsx`: adicionar item "Indicações" (ícone `Gift`).
   - `src/App.tsx`: rota `/indicacoes`.
   - `src/pages/AuthPage.tsx` (ou onde for o cadastro): se houver `?ref=CODE` na URL, salvar em `localStorage` e, após cadastro, chamar `affiliates` com `action: "register-referral"` para vincular o novo usuário ao afiliado.

### Banco de dados

Não há mudanças de schema necessárias — `afiliados` e `indicacoes` já existem. Apenas mudanças de lógica nas Edge Functions.

### Critérios de aceite

- Banner aparece no dashboard para todos os usuários logados, com contagem real.
- Link de afiliado pode ser gerado e copiado.
- Quando um indicado paga qualquer plano, o indicador recebe automaticamente +30 dias (ou vitalício na 10ª).
- Notificação aparece para o indicador a cada recompensa.
- Auto-indicação e dupla-indicação do mesmo usuário continuam bloqueadas.

Aguardando sua aprovação para implementar.