## Problema

Quando o teste grátis acaba e o usuário clica em **"QUERO ESTE PLANO"** no `SignupGateDialog`, dois popups aparecem corretamente (gate → checkout). Porém, no fundo, a tela visível é a de **login**. Se ele fechar o popup de checkout, fica preso no login — perdendo o contexto de onde estava (dashboard, música, etc.).

## Causa raiz

Em `src/components/demo/SignupGateDialog.tsx`, o handler `handlePick` faz:

```ts
setCheckoutPlan(...);   // abre PublicCheckoutDialog
closeGate();
void deactivateDemo();  // 👈 desloga o usuário demo IMEDIATAMENTE
```

Ao deslogar o usuário anônimo, o `DemoOrProtectedRoute` detecta `!user` e redireciona para `/login`. Esse redirect acontece **por baixo** do dialog de checkout, então ao fechar, o usuário cai no `/login`.

O `deactivateDemo()` foi colocado ali por precaução (para o checkout público criar uma conta nova sem conflito), mas a sessão demo anônima não atrapalha o `PublicCheckoutDialog` — ele cria a conta real via edge function e faz `setSession` depois do pagamento confirmado, substituindo a sessão demo naturalmente.

O mesmo padrão se repete em `handleGoLogin` (ali sim faz sentido, pois o usuário está indo pro login de propósito).

## Solução

### 1. `src/components/demo/SignupGateDialog.tsx`
- **Remover** `void deactivateDemo()` de `handlePick`. Manter a sessão demo viva enquanto o checkout está aberto, para que a rota por trás continue válida.
- Garantir que `closeGate()` só feche o gate (não navegue).
- No fechamento do `PublicCheckoutDialog` (quando o usuário cancela sem pagar), **não fazer nada** — ele permanece na tela onde estava, ainda em modo demo, e pode reabrir o gate quando quiser.
- No sucesso do checkout (já tratado dentro do `PublicCheckoutDialog` via `setSession` com a conta nova), a sessão demo é substituída automaticamente pela conta paga. Adicionar um `void deactivateDemo()` defensivo apenas **se** o checkout indicar falha de substituição (não é necessário no fluxo atual; revisar `PublicCheckoutDialog.onSuccess` para confirmar).

### 2. Sanidade no `DemoModeContext`
- `deactivateDemo()` continua chamando `supabase.auth.signOut()`. Como não é mais invocado ao escolher plano, o redirect para `/login` deixa de acontecer no meio do fluxo.
- Nenhuma mudança de contrato exigida.

### 3. Verificação manual
- Esgotar as 5 plays como demo.
- Clicar **QUERO ASSINAR AGORA** → escolher plano → checkout abre.
- **Fechar** o checkout (X) → deve voltar para a página onde estava (dashboard/música), ainda como demo, **não** para `/login`.
- Reabrir gate via player/banner → fluxo continua funcionando.
- Concluir checkout até o pagamento → sessão real assume e usuário cai no dashboard autenticado.

## Arquivos a editar

- `src/components/demo/SignupGateDialog.tsx` — remover `deactivateDemo()` de `handlePick`.

## Fora do escopo

- Não mexer em `PublicCheckoutDialog` (lógica de pagamento permanece).
- Não mexer em `DemoOrProtectedRoute` — o comportamento de redirecionar para `/login` quando não há usuário continua correto para os outros fluxos.
- Não alterar `handleGoLogin` (deslogar ali é intencional).
