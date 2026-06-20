## Problema

Quando o admin marca uma assinatura como **expirada** ou **cancelada** no painel, o usuário afetado continua entrando no app normalmente (dashboard, biblioteca, etc.) como se tivesse acesso pago.

## Causa raiz

O guard `src/components/auth/DemoOrProtectedRoute.tsx` foi modificado em algum momento para "permitir 5 plays grátis" antes de exigir assinatura. O bloco virou:

```ts
// Remove immediate redirect to /planos for logged-in users without subscription
if (!isAdmin && !assinatura && location.pathname === "/planos") {
  return <Outlet />;
}
return <Outlet />;   // 👈 fallback libera TUDO mesmo sem assinatura
```

Resultado: qualquer usuário **logado** (não-anônimo) sem assinatura ativa — incluindo alguém cuja assinatura foi expirada/cancelada pelo admin — recebe `<Outlet />` e navega livremente. O `useAssinatura` retorna `null` corretamente (filtra `status='active'` e `expires_at > now`), mas o guard não age sobre isso.

Adicionalmente:
- `DemoModeContext.isDemoUser` também trata o caso (`!assinatura` → vira "demo"), mas isso só limita **plays** (5 músicas), não restringe **navegação** nem o resto da UI. Por isso o usuário "expirado" parece ter acesso normal.
- `ProtectedRoute` (usado em rotas que exigem pagamento) já redireciona corretamente; o vazamento está só no `DemoOrProtectedRoute`.

## Solução

### 1. `src/components/auth/DemoOrProtectedRoute.tsx`
Diferenciar **usuário anônimo (demo real)** de **usuário logado sem assinatura ativa**:

- Anônimo (`is_anonymous` / `app_metadata.demo_user`): mantém comportamento atual — `<Outlet />` (server-side limita os 5 plays).
- Logado **sem** assinatura ativa **e** não-admin: redirecionar para `/planos`, exceto se já estiver em rotas permitidas (`/planos`, `/completar-perfil`, `/conta`, `/ofertas`).
- Logado com assinatura ativa **ou** admin: `<Outlet />` (comportamento atual).

Pseudocódigo:

```ts
const PUBLIC_FOR_EXPIRED = ["/planos", "/completar-perfil", "/conta", "/ofertas"];

if (!isAdmin && !assinatura) {
  if (!PUBLIC_FOR_EXPIRED.some(p => location.pathname.startsWith(p))) {
    return <Navigate to="/planos" replace />;
  }
}
return <Outlet />;
```

Isso garante que, assim que o admin cancela/expira, no próximo refetch (ou troca de rota) o usuário cai em `/planos` e precisa reassinar.

### 2. Forçar refetch da assinatura
Para que a mudança no admin reflita rápido na sessão aberta do usuário, o `useAssinatura` precisa revalidar:

- Em `src/hooks/useUser.ts`, adicionar à query `["assinatura", userId]`:
  - `refetchOnWindowFocus: true`
  - `refetchOnReconnect: true`
  - `staleTime: 30_000` (já refetchará rápido ao voltar à aba)

Sem isso o cache do React Query pode segurar a assinatura antiga indefinidamente na sessão do usuário.

### 3. Verificação manual
1. Logar como usuário com assinatura ativa → acessar `/dashboard`.
2. Em outra aba, no super admin, cancelar (ou marcar expired) a assinatura desse usuário.
3. Voltar à aba do usuário → ao mudar de rota ou refocar, deve ser redirecionado para `/planos`.
4. Logar de novo do zero como esse usuário → deve cair direto em `/planos` em vez do dashboard.
5. Usuário anônimo do modo demo continua navegando normalmente (sem regressão).

## Arquivos a editar

- `src/components/auth/DemoOrProtectedRoute.tsx` — separar usuário demo (anônimo) de usuário logado sem assinatura; redirecionar o segundo para `/planos`.
- `src/hooks/useUser.ts` — habilitar `refetchOnWindowFocus`/`refetchOnReconnect` na query `useAssinatura`.

## Fora do escopo

- Não mexer no `ProtectedRoute` nem nas mutations do admin (já estão corretas — escrevem `status='cancelled'` + `expires_at=now`).
- Não criar nova ação "Marcar como expirada" se a intenção do admin é cancelar — o `cancelSub` existente já produz o mesmo efeito (`useAssinatura` filtra por `expires_at > now`).
