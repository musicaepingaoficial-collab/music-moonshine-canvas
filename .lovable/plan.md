# Plano: corrigir comportamento do "teste expirado"

## Problema observado
Quando um usuário com **teste gratuito expirado** (trial_user já cadastrado, mas com as 5 reproduções consumidas e sem assinatura) faz login, o app está redirecionando direto para `/planos` em vez de deixar entrar no sistema. O esperado é:

1. Login → entra no `/dashboard` normalmente, navega à vontade (biblioteca, busca, perfis etc.).
2. Só ao **clicar em reproduzir uma música** é que o `SignupGateDialog` aparece, mostrando **apenas Mensal e Anual** (como já está configurado hoje).

A causa atual está em `src/components/auth/DemoOrProtectedRoute.tsx`: quando o usuário logado não é trial e não tem assinatura, o guard manda para `/planos`. Usuários antigos (cadastrados antes do flag `trial_user`) caem nessa regra. Também é o caso de qualquer signup feito fora do fluxo `/login?intent=trial`.

## Solução

Tratar **todo usuário logado sem assinatura ativa** (e que não seja admin) como usuário em modo demonstração — exatamente como já fazemos com `trial_user`. Assim:
- Ele entra no sistema normalmente.
- O contador de plays (`demo_play_log`) já é por `user_id`, então o limite de 5 continua valendo.
- O `SignupGateDialog` (Mensal + Anual) é aberto pelo player ao bater o limite ou ao tentar reproduzir já expirado.

### Arquivos a alterar

1. **`src/components/auth/DemoOrProtectedRoute.tsx`**
   - Remover o redirect `→ /planos` para usuários logados sem assinatura.
   - Manter o redirect `→ /completar-perfil` quando faltar `whatsapp`.
   - Continuar permitindo admin e usuários com assinatura normalmente.
   - Resultado: qualquer usuário autenticado (com perfil completo) recebe `<Outlet />`.

2. **`src/contexts/DemoModeContext.tsx`**
   - Ampliar `isDemoUser`: além de anônimo / `demo_user` / `trial_user sem assinatura`, incluir **qualquer usuário logado, não-admin, sem assinatura**, depois que `useAssinatura` terminou de carregar.
   - Usar `useIsAdmin(user?.id)` para excluir admins do modo demo.
   - Sem isso, o player não dispararia `openGate` para esses usuários.

3. **Sem mudanças** em `SignupGateDialog.tsx` (já filtra `slug in ['mensal','anual']`), `MusicPlayer`, `demo_play_log`, schema ou edge functions.

## Detalhes técnicos

- `DemoOrProtectedRoute` passa a ter apenas dois bloqueios para logado: perfil incompleto → `/completar-perfil`; tudo mais → `<Outlet />`.
- `DemoModeContext` calcula:
  ```
  isDemoUser =
    isAnonymous ||
    hasDemoMetadata ||
    (!loading && !isLoadingAssinatura && !isLoadingAdmin && !!user && !isAdmin && !assinatura)
  ```
  Mantém `staleTime: 5_000` e `refetchOnWindowFocus: true` para reagir rápido a assinatura recém-criada.
- Página `/planos` continua acessível por link/botão (banner "Assinar agora", CTA do gate, etc.) — apenas deixa de ser forçada.
- Recuperação por email (`send-recovery-emails`) continua funcionando: trial/sem assinatura permanecem em `profiles`.

## Plano de teste

1. Login com usuário trial cujo `plays_used = 5` → cai em `/dashboard`, navega livre.
2. Clicar play em qualquer música → `SignupGateDialog` abre mostrando **Mensal** e **Anual** apenas.
3. Login com usuário antigo (sem `trial_user`) sem assinatura → mesmo comportamento.
4. Login com assinante ativo → fluxo normal, sem gate.
5. Login como admin sem assinatura → entra no admin, sem gate ao reproduzir.
6. Após assinar, o gate some e plays liberam (invalidação de `useAssinatura`).
