# Plano: corrigir "0 afiliados" na página Admin → Afiliados

## Diagnóstico

Verifiquei o banco diretamente e existem **6 afiliados** cadastrados na tabela `public.afiliados` (rmoraes42, pereira.cgilmar, hcas59, franciscovagner…, adautoteclas, ninhorb11). Também confirmei que:

- A função `admin_afiliados_stats()` existe e o JOIN funciona — quando rodo o mesmo SELECT direto, retorna as 6 linhas com `clicks=0` e `signups=0` (ainda não houve cliques nem indicações).
- A RLS de `afiliados` permite admin (`has_role(auth.uid(),'admin')`).
- Existem 2 admins: `rmoraes42@gmail.com` e `robsonmoraesdesigner@gmail.com`.

Como a página mostra **0 afiliados** mesmo com 6 no banco, a chamada `rpc('admin_afiliados_stats')` está falhando silenciosamente no front. As 3 causas prováveis, em ordem:

1. **Usuário logado no preview não é admin** → o RPC faz `RAISE EXCEPTION 'forbidden'`, o React Query joga o erro, o estado fica `undefined` e `totals.afiliados` cai para 0. A UI hoje só mostra "Nenhum afiliado encontrado." sem expor o erro.
2. **RPC retorna erro mas não é exibido** — a página não tem `ErrorState`; um erro de rede/permissão fica invisível.
3. **Tipos do Supabase ainda não regenerados** após a migration — improvável quebrar em runtime porque usamos `(supabase as any).rpc(...)`, mas vale revalidar.

## Mudanças

### 1. `src/pages/admin/AdminAfiliadosPage.tsx`
- Capturar `error` do `useQuery` e exibir um bloco vermelho com a mensagem real (`error.message`) acima da tabela. Isso vai mostrar imediatamente se é `forbidden`, rede, etc.
- Adicionar `console.log("[AdminAfiliados]", { stats, error })` para debug rápido.
- Trocar o texto "Nenhum afiliado encontrado." por dois estados distintos: erro vs. lista vazia de verdade.

### 2. Fallback resiliente para não-admin acidental
- Se o erro for `forbidden`, mostrar mensagem clara: "Esta página é restrita a administradores. Você está logado como X." com botão de logout.

### 3. (Opcional) Garantir contagem mesmo sem cliques/indicações
- A RPC já usa `LEFT JOIN`, então afiliados sem cliques aparecem com 0. Vou revalidar isso na UI: caso `stats.length > 0`, sempre renderiza a tabela mesmo com todas as colunas zeradas — isso confirma o cadastro.

## Como validar

1. Recarregar `/admin/afiliados` logado como `rmoraes42@gmail.com`.
2. Devem aparecer os 6 afiliados na tabela, todos com `Cliques=0`, `Cadastros=0`, `Receita=R$ 0,00`.
3. Stat card "Afiliados" passa a mostrar **6**.
4. Se aparecer erro `forbidden`, é sinal de que o usuário logado no preview não tem role `admin` em `user_roles` — me avisa o e-mail que aparece no canto da página que eu resolvo.

## Detalhes técnicos

- Arquivo único alterado: `src/pages/admin/AdminAfiliadosPage.tsx`.
- Sem mudanças de banco (a função RPC já está correta, dados existem).
- Sem novas dependências.
