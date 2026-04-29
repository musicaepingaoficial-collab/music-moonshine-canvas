# Opção B: gate de assinatura após cadastro em /login

Manter "Criar conta" em `/login`, mas após cadastro o usuário cai numa tela com `SubscriptionDialog` (planos + trial) antes de acessar o dashboard. Quem não tem assinatura ativa nem trial é bloqueado em `/dashboard`.

## Alterações

### 1. `src/components/auth/ProtectedRoute.tsx`
Adicionar checagem de assinatura ativa, depois da checagem de whatsapp:

- Usar `useAssinatura(user.id)` para buscar assinatura ativa.
- Se `!profile?.whatsapp` → redireciona para `/completar-perfil` (já existe).
- Se whatsapp ok mas não tem assinatura ativa (`assinatura == null`) e a rota atual não é `/completar-perfil` nem `/planos` → redireciona para `/planos`.
- Admins (`useIsAdmin`) passam direto, sem gate de assinatura (eles ganham vitalícia automática, mas garantimos bypass).
- Considerar `expires_at` nulo (vitalício) ou futuro como "ativa" — o hook já filtra por `status='active'`, então ok.

### 2. Nova página `src/pages/PlanosGatePage.tsx`
Página dedicada que renderiza `SubscriptionDialog` em modo `open` fixo, similar à parte final de `CompleteProfilePage`. Ao concluir (trial iniciado ou pagamento aprovado) invalida `["assinatura"]` e navega para `/dashboard`.

Layout: fundo igual ao login, título "Escolha seu plano para continuar", botão "Sair" no topo (chama `supabase.auth.signOut()` e vai para `/login`) para o usuário poder cancelar.

### 3. `src/App.tsx`
Adicionar rota:
```
<Route path="/planos" element={<PlanosGatePage />} />
```
Como rota pública (fora de `ProtectedRoute`), mas a página em si exige usuário logado — se `!user`, redireciona para `/login`. Isso evita loop de redirect dentro do `ProtectedRoute`.

### 4. `src/pages/CompleteProfilePage.tsx`
Substituir o `SubscriptionDialog` inline por `navigate("/planos")` quando não houver assinatura. Mantém comportamento atual mas centraliza a tela de planos numa rota só.

### 5. `src/pages/LoginPage.tsx`
No fluxo de `signUp`, após sucesso:
- Se a sessão já estiver criada (confirmação de email desativada), navegar direto para `/planos`.
- Se exigir confirmação de email, manter o toast atual ("Verifique seu email…").

O `ProtectedRoute` cobre o caso de o usuário voltar logado mais tarde.

## Detalhes técnicos

- `useAssinatura` retorna a primeira `assinatura` com `status='active'`. Trial criado por `create-trial` precisa inserir com `status='active'` (já é o caso pelas tabelas existentes).
- Admins na allowlist recebem vitalícia automaticamente via trigger `assign_admin_for_allowlisted_email`, então o gate não os bloqueia.
- Sem mudanças de DB nem de edge functions.

## Arquivos
- editar: `src/components/auth/ProtectedRoute.tsx`, `src/App.tsx`, `src/pages/CompleteProfilePage.tsx`, `src/pages/LoginPage.tsx`
- criar: `src/pages/PlanosGatePage.tsx`
