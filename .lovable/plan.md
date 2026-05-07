# Correções no fluxo de checkout

## 1. "Mercado Pago não configurado"

**Causa:** o secret `MERCADO_PAGO_ACCESS_TOKEN` não está cadastrado nas Edge Function Secrets. A função `create-payment` retorna esse erro literalmente quando `Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")` é vazio.

**Correção:** adicionar o secret `MERCADO_PAGO_ACCESS_TOKEN` no projeto. Vou pedir o token (Access Token de produção ou de teste do painel do Mercado Pago) e cadastrá-lo via `add_secret`. Sem isso nenhuma das outras correções de pagamento funciona.

Também vou melhorar a mensagem de erro mostrada na tela "Pagamento recusado" para diferenciar erro de configuração de erro real do cartão.

## 2. "CartÃ£o" e outros textos com encoding quebrado

**Causa:** vários arquivos foram salvos com mojibake (UTF‑8 lido como Latin‑1). Aparece em:
- `src/components/subscription/CheckoutForm.tsx` — botão `CartÃ£o` (linha 488), toasts `CÃ³digo Pix copiado`, `NÃ£o foi possÃ­vel...`, mensagens `valido`/`Nao` sem acento.
- Tela de erro com `Mercado Pago nao configurado` (vem do edge function — corrigir as mensagens em `supabase/functions/create-payment/index.ts`).

**Correção:** reescrever todas as strings com acentuação correta. O botão Cartão fica `CARTÃO` (uppercase como pediu).

## 3. Após cadastro o usuário cai em "Escolha seu plano" novamente

**Causa:** ao concluir o cadastro dentro do `PublicCheckoutDialog`, o componente faz `signUp` + `signIn`. Quando o `user` da `useAuth` atualiza, qualquer rota protegida que o usuário acesse em seguida (ou a navegação interna após o pagamento) leva a `/planos`, que renderiza o `PlanosGatePage` com o `SubscriptionDialog` mostrando a grade de planos do zero. Isso descarta o plano que ele já tinha clicado.

**Correção:**
- Após `signIn`, manter o `PublicCheckoutDialog` aberto direto em `step="payment"` com o plano selecionado (já é o comportamento desejado), e impedir que a `LandingPage` navegue para `/dashboard` enquanto o checkout estiver aberto (já existe a guarda `!checkoutPlan`, mas vou reforçar para não navegar enquanto `step === "payment"`).
- Aceitar um query param `?plano=<slug>` em `/planos` (`PlanosGatePage`). Quando presente, abrir o `SubscriptionDialog` já com aquele plano selecionado e pular a tela de grade indo direto para o `CheckoutForm`.
- Em qualquer redirecionamento que aconteça pós-cadastro (Protected/PlanosGate), preservar o slug do plano via query string.

## 4. Botão "Voltar" do navegador leva a uma tela "Hostinger" infinita

**Causa provável:** o domínio antigo da Hostinger ainda redireciona para a landing nova via 302/meta-refresh. Quando o usuário clica em Voltar, o browser revisita a URL antiga, que redireciona de novo, criando o loop. O cookie/cache da Hostinger é o que prende a tela de erro.

**Correção dentro do app (mitigação real):**
- Na `LandingPage`, ao montar, executar `window.history.replaceState(null, "", window.location.href)` quando o `document.referrer` apontar para um domínio externo conhecido (ex.: `*.hostinger.*`). Isso substitui a entrada de histórico para que o Voltar não retorne ao redirect quebrado.
- No `PublicCheckoutDialog`, ao fechar o dialog usar `navigate(-1)` somente se a entrada anterior for da mesma origem; caso contrário, ficar na própria landing.

**Fora do app (recomendação para o usuário):** remover o redirect 302 do domínio antigo na Hostinger ou trocá-lo por 301 com `Cache-Control: no-store`. Isso é a solução definitiva — o app só consegue mitigar.

## 5. Reaproveitar dados já cadastrados no checkout

**Causa:** o `CheckoutForm` só preenche `email` e `nome` a partir de `user_metadata`. O CPF cadastrado no `PublicCheckoutDialog` (e depois salvo em `profiles.cpf` pelo trigger `handle_new_user`) não é lido. O formulário do cartão (Mercado Pago) também não recebe nada via prefill.

**Correção:**
- `PublicCheckoutDialog` passa `prefill={ fullName, cpf, email, whatsapp }` como props para `CheckoutForm` ao avançar para `step="payment"`.
- `CheckoutForm` usa o prefill para popular `pixFullName`, `pixCpf`, `pixEmail` automaticamente.
- Quando vier de `/planos` (usuário já logado), buscar `profiles` (`name`, `cpf`, `whatsapp`) e usar para prefill.
- Para o card form do Mercado Pago, preencher os inputs `mp-cardholder-email`, `mp-cardholder-name`, `mp-identification-type` (CPF) e `mp-identification-number` via `value` inicial após o `onFormMounted`.

## Arquivos afetados

- `supabase/functions/create-payment/index.ts` — corrigir encoding das mensagens.
- `src/components/subscription/CheckoutForm.tsx` — encoding, prefill, uppercase "CARTÃO", melhor mensagem de erro de configuração.
- `src/components/subscription/PublicCheckoutDialog.tsx` — passar prefill e impedir fechamento prematuro.
- `src/components/subscription/SubscriptionDialog.tsx` — aceitar `initialPlanSlug` para pular grade.
- `src/pages/PlanosGatePage.tsx` — ler `?plano=` e passar para o dialog; preencher prefill via profile.
- `src/pages/LandingPage.tsx` — `replaceState` quando referrer for externo; preservar `?plano=` em redirects.
- Secret novo: `MERCADO_PAGO_ACCESS_TOKEN`.

## O que preciso confirmar antes de implementar

1. Você tem o **Access Token do Mercado Pago** em mãos para eu cadastrar no secret? (é o token que começa com `APP_USR-...` da seção "Suas integrações" → "Credenciais de produção" no painel MP).
2. O domínio Hostinger antigo ainda está com redirect ativo? Se sim, recomendo desligar; senão a mitigação no app cobre só parte dos casos.
