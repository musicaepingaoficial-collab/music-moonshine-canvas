## Problema

A identificação de super admin falha intermitentemente. Investigação mostrou três causas:

### 1. Duas implementações concorrentes da mesma query
- `src/hooks/useUser.ts` → `useIsAdmin()` usa queryKey `["is-admin", userId]` com `staleTime: 5 min` e retorna `Boolean(data)`.
- `src/components/auth/AdminRoute.tsx` reimplementa a query inline com a **mesma queryKey** `["is-admin", user?.id]`, mas **sem staleTime** e sem tratamento robusto.

Como o React Query deduplica por chave, qual versão "ganha" depende de qual monta primeiro. Se o `AdminRoute` montar primeiro (ex.: navegação direta para `/admin`), a versão sem `staleTime` é cacheada e qualquer flicker de rede faz `isAdmin` voltar a `false`.

### 2. Erros de RPC silenciosamente viram `false`
Em ambas as implementações:
```ts
if (error) return false;
```
Quando há um erro transitório (rede, token expirando, refresh em andamento), o usuário é tratado como **não-admin** e redirecionado. Isso explica os "momentos" em que o sistema não identifica o admin.

### 3. Race condition com sessão
`useIsAdmin` é chamado com `user?.id` logo após `useAuth`. Em alguns ciclos, a query dispara antes do token ser totalmente propagado, causando falha de RLS na RPC.

## Plano de correção

### A. Centralizar `useIsAdmin` (uma fonte da verdade)
Arquivo: `src/components/auth/AdminRoute.tsx`
- Remover a query inline.
- Importar e usar `useIsAdmin` de `@/hooks/useUser`.

### B. Tornar `useIsAdmin` resiliente
Arquivo: `src/hooks/useUser.ts`
- Em vez de engolir erro como `false`, **lançar** o erro para que o React Query faça retry.
- Adicionar `retry: 2` e `retryDelay` exponencial.
- Manter `staleTime: 5 min` e adicionar `gcTime: 10 min`.
- Garantir `enabled: !!userId` (já existe).
- Distinguir "carregando/erro" de "definitivamente não-admin": expor também `isError` para os consumidores que quiserem tratar.

### C. Esperar a sessão estar pronta
Arquivo: `src/hooks/useUser.ts`
- No `useAuth`, só considerar `loading=false` após o primeiro `onAuthStateChange` confirmar (já está perto disso).
- Em `ProtectedRoute` e `AdminRoute`: enquanto `useIsAdmin` estiver em `isLoading` **ou** `isFetching` na primeira vez, mostrar o loader em vez de redirecionar. Não redirecionar com base em `isAdmin === false` se a query ainda não foi bem-sucedida pelo menos uma vez.

### D. Invalidação após login
Arquivo: `src/hooks/useUser.ts`
- No listener `onAuthStateChange`, ao detectar `SIGNED_IN` ou `TOKEN_REFRESHED`, invalidar `["is-admin"]` e `["assinatura"]` para forçar recarregar com o novo token.

### E. (Opcional, recomendado) Verificar via `user_roles` direto como fallback
Se a RPC `has_role` falhar, fazer fallback para `select` em `user_roles` filtrando por `user_id` e `role='admin'` (a policy "Users can view own roles" permite). Isso elimina pontos únicos de falha.

## Arquivos alterados

- `src/hooks/useUser.ts` — endurecer `useIsAdmin` (retry, não engolir erros, invalidação no auth change, fallback opcional).
- `src/components/auth/AdminRoute.tsx` — usar `useIsAdmin` central; não redirecionar enquanto a query ainda não teve sucesso.
- `src/components/auth/ProtectedRoute.tsx` — mesma regra de "esperar sucesso" antes de tratar como não-admin para o gate de assinatura.

Sem mudanças de banco de dados.

## Resultado esperado

- Admin deixa de ser ocasionalmente redirecionado para `/dashboard` ou `/planos`.
- Erros transitórios fazem retry em vez de "rebaixar" o usuário.
- Uma única queryKey `["is-admin", userId]` em todo o app, com cache estável.
