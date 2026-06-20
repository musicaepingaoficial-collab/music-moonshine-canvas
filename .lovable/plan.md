# Plano: Nova Pricing Section (Mensal + Anual)

## Objetivo
Reformular a seção `#planos` da `LandingPage.tsx` para exibir apenas 2 cards centralizados (Mensal e Anual), com ancoragem de preço fazendo o Anual parecer a escolha óbvia. Sem alterar lógica de checkout, banco ou outras telas (Admin, Dialog, etc).

## Escopo
Arquivo único: `src/pages/LandingPage.tsx` — apenas o bloco `{/* PLANS */}` (linhas ~709 a 818) e o filtro `visiblePlanos` (linha 264).

Sem mudanças em:
- Tabela `planos` no banco (Trimestral/Vitalício continuam existindo para usuários já assinantes e área admin)
- `SubscriptionDialog`, `CheckoutForm`, webhooks
- Outras seções da landing (hero, FAQ, etc.)

## Mudanças

### 1. Filtro de planos exibidos
Alterar `visiblePlanos` para incluir somente `mensal` e `anual`, e ordenar (Mensal primeiro, Anual segundo):

```ts
const visiblePlanos = (planos ?? [])
  .filter((p: any) => p.slug === "mensal" || p.slug === "anual")
  .sort((a: any, b: any) => (a.slug === "mensal" ? -1 : 1));
```

### 2. Grid centralizado de 2 colunas
Substituir `grid sm:grid-cols-2 lg:grid-cols-4` por layout 2-up centralizado com largura limitada:

```text
grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch
```

### 3. Card MENSAL (padrão)
- Badge: nenhum
- Título: `MENSAL`
- Subtítulo: `Acesso completo por 30 dias`
- Preço: `R$ 34,90` + `/ mês` — **sem** linha "De R$ X por"
- Benefícios (check verde `text-primary`):
  - +100 mil músicas
  - Download faixa a faixa
  - Packs completos
  - Pesquisa inteligente
  - Atualizações mensais
  - Formato MP3
- Botão: estilo secundário (outline verde), texto `QUERO ESTE PLANO`

### 4. Card ANUAL (destaque)
- Container com efeito visual reforçado:
  - `border-primary`
  - `shadow-glow-lg`
  - `ring-2 ring-primary/40`
  - `sm:scale-[1.04]` e leve `-translate-y-1`
  - `animate-glow-pulse` (já existe em `index.css`) para o brilho contínuo
- Badge no topo (fundo verde, texto branco):
  - `👑 MAIS VENDIDO` usando `<Crown />` + texto, `bg-gradient-cta text-primary-foreground shadow-glow`
- Título: `ANUAL`
- Subtítulo: `Acesso completo por 1 ano`
- Preço ancorado:
  - Linha pequena riscada: `De R$ 418,80 por`
  - Preço principal: `R$ 97,00` + `/ ano` (fonte maior que o Mensal: `text-5xl`)
- Benefícios: mesmos 6 do Mensal **+** linha extra final em destaque verde:
  - `<Crown className="text-primary" /> Discografias inclusas` (texto `text-primary font-semibold`)
- CTA: botão mais chamativo da tela
  - `bg-gradient-cta text-primary-foreground shadow-glow hover:opacity-95 h-14 text-base font-black`
  - Texto: `QUERO ESTE PLANO`

### 5. Comportamento do botão
Manter exatamente o `onClick` atual (`trackEvent("add_to_cart", …)` + `setCheckoutPlan(...)`) usando dados do plano carregado do banco — sem hardcoded de preço na lógica, só hardcoded no fallback visual caso `planos` ainda não tenha chegado.

### 6. Fallback enquanto carrega
Se `planos` ainda vazio, renderizar 2 skeletons com mesma estrutura (largura/altura) para evitar layout shift.

## Detalhes técnicos
- Reaproveitar tokens já existentes: `bg-gradient-cta`, `shadow-glow`, `shadow-glow-lg`, `animate-glow-pulse`, `text-gradient-brand`, `text-primary`. Nada de cores hardcoded.
- Remover imports não usados após a edição (`TrendingUp` se não for mais referenciado em outro lugar do arquivo — verificar antes de remover).
- Não tocar em `Crown`, `Check`, `Card`, `Button` (já importados).
- Texto do header da seção mantido; apenas o subtítulo pode ser ajustado para "Pagamento único ou recorrente" → "Mensal flexível ou Anual com desconto" para coerência (opcional, manter se preferir o original).

## Validação
1. Abrir `/` → rolar até `#planos`: ver 2 cards centralizados, Anual visivelmente maior/com glow.
2. Conferir preço ancorado riscado `R$ 418,80` apenas no Anual.
3. Clicar em cada CTA: abre o checkout do plano correto (`mensal` / `anual`).
4. Build limpo, sem warnings de import não usado.