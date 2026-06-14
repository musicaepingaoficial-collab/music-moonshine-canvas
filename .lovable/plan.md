# Painel Admin de Afiliados

Página `/admin/afiliados` para o super admin acompanhar todos os afiliados: cliques, cadastros, conversões e receita gerada.

## O que o admin verá

**Cards no topo (totais gerais):**
- Total de afiliados ativos
- Total de cliques (todos os links)
- Total de cadastros via indicação
- Total de conversões pagas
- Receita total gerada por afiliados (R$)
- Comissão total devida (R$)

**Tabela de afiliados** com colunas:
- Nome / e-mail do afiliado
- Código do link
- Cliques
- Cadastros (indicações criadas)
- Conversões (indicados que viraram assinantes pagos)
- Taxa de conversão (%)
- Receita gerada (soma dos pagamentos dos indicados)
- Comissão (%) e valor devido (R$)
- Ações: editar comissão, ver detalhes, copiar link

**Drawer/Dialog de detalhes** ao clicar em um afiliado:
- Lista dos indicados (nome, data, status, plano, valor)
- Histórico de cliques por dia (gráfico simples)

## Mudanças necessárias

### 1. Tabela nova: `afiliado_clicks`
Hoje não existe rastreamento de cliques. Criar tabela:
- `afiliado_id` (fk)
- `referrer` (texto, opcional)
- `user_agent` (texto)
- `ip_hash` (texto — hash, não IP cru)
- `created_at`

RLS: insert público (qualquer visitante), select só admin.

### 2. Edge function pública `track-affiliate-click`
Chamada por `ReferralTracker.tsx` quando detecta `?ref=CODIGO` na URL. Resolve o código → `afiliado_id` e insere uma linha em `afiliado_clicks`. Sem auth necessária.

### 3. Coluna nova em `indicacoes`
Adicionar `converted_at timestamptz` e `assinatura_id uuid` para marcar quando o indicado virou pagante (preenchido pelo webhook do MP em `payment-webhook` quando a primeira assinatura ativa for criada).

### 4. View/RPC `admin_afiliados_stats`
Função security definer que retorna, para todos os afiliados, os agregados (cliques, indicações, conversões, receita). Acessível só a admin via `has_role`.

### 5. Página `src/pages/admin/AdminAfiliadosPage.tsx`
- Cards de totais
- Tabela com sort/filtro por nome
- Botão "Editar comissão" → dialog que atualiza `commission_percent`
- Botão "Detalhes" → drawer com lista de indicados + cliques por dia
- Reusa `ResponsiveTable`

### 6. Rota + menu no admin
- Adicionar rota `/admin/afiliados` em `App.tsx`
- Adicionar item no `AdminSidebar.tsx`

### 7. Atualizar `ReferralTracker.tsx`
Já registra `?ref=`. Adicionar chamada à edge function `track-affiliate-click` na primeira detecção do código (uma vez por sessão, via sessionStorage).

### 8. Atualizar `payment-webhook`
Quando uma assinatura é aprovada, se o usuário tem entrada em `indicacoes` com `status='pending'`, marcar `converted_at = now()` e `assinatura_id`.

## Arquivos afetados

**Novos:**
- `supabase/functions/track-affiliate-click/index.ts`
- `src/pages/admin/AdminAfiliadosPage.tsx`
- `src/components/admin/AfiliadoDetailsDrawer.tsx`

**Editados:**
- `supabase/functions/payment-webhook/index.ts` (marcar conversão)
- `src/components/referrals/ReferralTracker.tsx` (tracking de clique)
- `src/components/layout/AdminSidebar.tsx` (item de menu)
- `src/App.tsx` (rota)

**Migrações SQL:**
- Criar `afiliado_clicks` + grants + RLS
- Adicionar `converted_at`, `assinatura_id` em `indicacoes`
- Criar função `admin_afiliados_stats()`

## Fora do escopo
- Pagamento automático de comissões (só calcula o devido)
- Saque/financeiro do afiliado (apenas visão admin)

Posso implementar?
