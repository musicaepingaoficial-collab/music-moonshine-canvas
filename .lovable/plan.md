## Contexto correto

Você tem razão — o cadastro **com senha** já existe via `/login?intent=trial` (em `LoginPage.tsx`). O que precisa mudar é só **deixar de usar o login anônimo** e fazer o app reconhecer esse usuário como "trial" (sem assinatura, mas recuperável por e-mail).

Estado atual:

- `LandingPage.tsx` tem **dois caminhos paralelos** para "teste grátis":
  - 1 botão aponta para `/login?intent=trial` (fluxo correto, com senha).
  - 4 CTAs principais (`#problem`, `#benefits`, `#social-proof`, `#final`) ainda apontam para `/dashboard?demo=1` (fluxo anônimo via `signInAnonymously`).
- Edge function `create-trial` existe mas **não é chamada por ninguém** (orphan).
- Após o cadastro com `intent=trial`, o usuário cai em `/dashboard` sem `assinaturas` → o guard atualizado de hoje o redireciona para `/planos`. Ou seja, o fluxo "correto" está **quebrado** pela última mudança.

## Solução

Padronizar tudo no cadastro com senha e tratar quem se cadastrou via trial como "demo logado".

### 1. `src/pages/LandingPage.tsx`
- Trocar **todos** os `<Link to="/dashboard?demo=1">` por `<Link to="/login?intent=trial">`. Manter o `trackEvent("lead", ...)` em cada um.
- Resultado: única porta de entrada do trial é o cadastro com senha.

### 2. `src/pages/LoginPage.tsx`
- No `signUp` quando `intent === "trial"`, marcar `user_metadata.trial_user = true` (acrescentar ao objeto `options.data`).
- Manter o restante (consent_logs, tracking, redirect para `/dashboard`).
- Não chamar `create-trial` — vamos parar de usar essa função (ver item 7).

### 3. `src/contexts/DemoModeContext.tsx`
- Voltar `isDemoUser` a contemplar trial, mas só com flag explícita:

  ```ts
  const isTrialUser =
    (user as any)?.user_metadata?.trial_user === true ||
    (user as any)?.app_metadata?.trial_user === true;

  const isDemoUser =
    !!(user as any)?.is_anonymous ||
    (user as any)?.app_metadata?.demo_user === true ||
    (user as any)?.user_metadata?.demo_user === true ||
    (isTrialUser && !isLoadingAssinatura && !assinatura);
  ```

- Remover `signInAnonymously` e o fallback `demo-signin` em `startDemoSession`.
- Remover suporte ao parâmetro `?demo=1` e ao `PENDING_FLAG`.
- `activateDemo` passa a apenas redirecionar para `/login?intent=trial`.

### 4. `src/components/auth/DemoOrProtectedRoute.tsx`
- Permitir browse para anônimo (legado) **e** para `trial_user && !assinatura`.
- Demais usuários logados sem assinatura continuam redirecionados para `/planos`.

  ```ts
  const isAnonymous = !!(user as any)?.is_anonymous;
  const isTrialUser =
    (user as any)?.user_metadata?.trial_user === true ||
    (user as any)?.app_metadata?.trial_user === true;

  if (isAnonymous || (isTrialUser && !assinatura)) return <Outlet />;

  if (!isAdmin && !assinatura) {
    if (!ALLOWED.some(p => location.pathname.startsWith(p))) {
      return <Navigate to="/planos" replace />;
    }
  }
  return <Outlet />;
  ```

### 5. `src/components/demo/SignupGateDialog.tsx` + `PublicCheckoutDialog.tsx`
- Quando o usuário do gate é um trial logado:
  - Não usar fluxo "guest/anonymous" do checkout. Passar `anonymous: false` no `paymentService.postPayment` para que a assinatura saia vinculada ao `user.id` real.
  - Pré-preencher e-mail, nome, WhatsApp e CPF (do `profile`).
  - Manter o fluxo anonymous=true como fallback apenas se `user` não existir.
- `PublicCheckoutDialog` precisa receber `existingUser?: { id, email, name, whatsapp, cpf }` e, quando presente, **pular** as etapas de "criar conta + senha" (o usuário já tem). Após pagamento aprovado, apenas invalida queries.

### 6. `src/components/demo/DemoBanner.tsx`
- Sem mudanças funcionais. Como `isDemoUser` cobre o trial, o banner aparece corretamente.

### 7. Edge function `create-trial`
- **Excluir** (orphan, e não queremos criar `assinaturas plan='trial'` que se passe por assinatura real e habilite downloads).
- Excluir o arquivo `supabase/functions/create-trial/index.ts`.

### 8. Recuperação de leads
- `send-recovery-emails` já consulta `profiles` por e-mail e exclui quem tem assinatura. Trial users entram automaticamente na fila.
- Opcional, fora de escopo: filtrar `user_metadata.trial_user = true` para campanhas dedicadas.

---

## Plano de teste

1. Landing → clicar qualquer CTA de "Teste grátis" → cai em `/login?intent=trial` em modo cadastro.
2. Preencher nome/email/whatsapp/senha + termos → submit.
3. Verificar no banco: `profiles` populado com e-mail; `auth.users.raw_user_meta_data.trial_user = true`.
4. `/dashboard` renderiza normalmente; `DemoBanner` aparece com "Modo demonstração — restam 5 músicas".
5. Tocar 3 → `DemoWarningDialog`; tocar 5 → `SignupGateDialog`.
6. Escolher plano → checkout pré-preenchido; pagar cartão → assinatura criada com `user_id` correto, sem criar conta nova.
7. Voltar ao app → `DemoBanner` some, downloads habilitados, guard libera tudo.
8. Cancelar essa assinatura no super-admin → próxima ação do usuário → `/planos` (já que não é mais trial_user com sub).
9. Rodar `send-recovery-emails` num lead que cadastrou trial e não pagou → recebe step 1.

---

## Arquivos a editar / criar / remover

**Editar:**
- `src/pages/LandingPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/contexts/DemoModeContext.tsx`
- `src/components/auth/DemoOrProtectedRoute.tsx`
- `src/components/demo/SignupGateDialog.tsx`
- `src/components/subscription/PublicCheckoutDialog.tsx`

**Remover:**
- `supabase/functions/create-trial/index.ts`

**Não tocar:**
- Migration / schema.
- `handle_new_user` trigger.
- `send-recovery-emails`.
- `demo_play_log` (continua sendo a fonte do contador de plays para trial users).

## Fora de escopo

- Não vamos limpar usuários anônimos antigos do `auth.users` agora.
- Não vamos criar uma campanha de recuperação dedicada a trials (a campanha geral já alcança).
- Não vamos mudar o fluxo de senha — o `LoginPage` já coleta senha no cadastro.
