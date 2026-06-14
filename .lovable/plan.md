# Corrigir filtro de plano do banner (Vitalício recebendo "Super Promoção")

## Diagnóstico

O banner está configurado corretamente no admin:

- `include_plan_slugs = [mensal, trimestral, anual]`
- `exclude_plan_slugs = [vitalicio]`

A regra em `HeroCarousel.tsx` depende de `currentPlan`, vindo de `useAssinatura(user.id)` em `src/hooks/useUser.ts`. Esse hook faz:

```ts
.from("assinaturas").select("*").eq("user_id", userId).eq("status","active").maybeSingle()
```

Consultando o banco, vários usuários têm **mais de uma assinatura ativa simultânea** (ex.: usuário `7f011c1e…` tem `mensal` E `vitalicio` ativos — admin/allowlist insere `vitalicio` mesmo quando já existia um plano pago). Com múltiplas linhas, `.maybeSingle()` retorna erro/`null`, então:

- `currentPlan` vira `null`
- a regra `excl.includes(currentPlan)` não bloqueia
- a regra de include também não bloqueia porque `HeroCarousel` só esconde quando há `include` e plano atual não bate — mas com `currentPlan = null` cai no `return false` do include… **exceto** que muitos usuários vitalícios entram como admin e o `currentPlan` continua `null`, e mesmo assim aparece porque o filtro falha silenciosamente quando `assinatura` vem como `undefined` (loading) — o React Query devolve `undefined` enquanto a query falha, e o componente já renderiza.

Resumo: o problema raiz é `useAssinatura` quebrar/retornar o plano errado quando o usuário tem várias linhas em `assinaturas`.

## Mudanças

### 1. `src/hooks/useUser.ts` — pegar a melhor assinatura ativa

Substituir `.maybeSingle()` por busca de lista e seleção determinística:

- `select("*").eq("user_id", userId).eq("status","active")`
- Em JS, filtrar `expires_at` no futuro ou `null`.
- Ordenar com prioridade: `vitalicio` > `anual` > `trimestral` > `mensal`.
- Como desempate, `expires_at` mais distante (NULL = infinito).
- Retornar a primeira; se nenhuma, `null`.

Aplicar a mesma lógica em `useHasActiveSubscription` se necessário (já usa o mesmo hook, então herda a correção).

### 2. `src/components/promotions/HeroCarousel.tsx` — endurecer filtro

- Enquanto `isLoading` ou `assinatura === undefined` (query ainda carregando), **não renderizar** o carrossel para evitar flash que ignora regras de plano.
- Quando `include_plan_slugs` está definido e o usuário não tem plano ativo, esconder (já faz).
- Quando `exclude_plan_slugs` inclui o plano atual, esconder (já faz, mas agora `currentPlan` virá correto).

### 3. (Opcional, não obrigatório agora) — limpar duplicatas em `assinaturas`

Não vamos alterar dados; só corrigir o frontend para lidar com múltiplas linhas. O trigger `assign_admin_for_allowlisted_email` continua criando `vitalicio` para admins; o hook passa a respeitar a melhor opção.

## Arquivos alterados

- `src/hooks/useUser.ts`
- `src/components/promotions/HeroCarousel.tsx`

Sem migrations, sem mudanças de RLS.

## Validação

- Logar como usuário vitalício → banner "Super Promoção" **não aparece** no dashboard.
- Logar como mensal/trimestral/anual → banner aparece e clica para `/ofertas`.
- Logar como visitante sem plano ativo → banner não aparece (include exige plano pago).
