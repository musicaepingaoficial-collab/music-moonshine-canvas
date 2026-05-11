# Corrigir responsividade dos cards de música

## Problema identificado

Em telas pequenas (~390px), o grid de músicas em pastas de repertório quebra: a segunda coluna do `grid-cols-2` aparece cortada, exigindo scroll horizontal.

### Causa raiz

No `MusicCard.tsx`, a barra de ações tem **4 botões** (Play, Favoritar, Download, Fila) com:

- `h-10 w-10` no mobile e `sm:h-8 sm:w-8` no desktop — ou seja, **maiores no celular**, o oposto do esperado
- `gap-2` entre eles
- Sem `flex-wrap` nem `min-w-0`

Largura mínima da barra: `4 × 40px + 3 × 8px = 184px`, mais o padding `p-3` (24px) = **~208px de min-content**.

Como flex items têm `min-width: auto`, o grid `grid-cols-2` (que usa `minmax(0, 1fr)`) acaba sendo empurrado pelo conteúdo: cada coluna passa de ~171px (esperado) para ~210px+, gerando overflow horizontal — exatamente o sintoma do screenshot.

O `AddToQueueButton.tsx` repete a mesma lógica `h-10 w-10 sm:h-8 sm:w-8`.

## Solução

### 1. `src/components/music/MusicCard.tsx`

Ajustar a barra de ações para realmente caber em 2 colunas no mobile:

- Mudar todos os 4 botões para `h-8 w-8` em todas as larguras (ou `h-7 w-7` no mobile, `sm:h-8 sm:w-8`)
- Reduzir `gap-2` para `gap-1.5` no mobile (`sm:gap-2`)
- Trocar `p-3` do container interno para `p-2 sm:p-3`
- Adicionar `min-w-0` no flex container das ações para impedir que empurrem o grid
- Reduzir o tamanho dos ícones no mobile (`h-3.5 w-3.5 sm:h-4 sm:w-4`)

### 2. `src/components/music/AddToQueueButton.tsx`

Mesma correção: trocar `h-10 w-10 sm:h-8 sm:w-8` por `h-8 w-8` consistente.

### 3. `src/pages/RepertorioPage.tsx` (defensivo)

No `renderMusicGrid`, adicionar `min-w-0` no `motion.div` wrapper de cada card para garantir que o grid track nunca seja empurrado por conteúdo interno:

```tsx
<motion.div key={t.id} className="min-w-0" variants={...}>
```

## Resultado esperado

- A 390px: dois cards lado a lado, sem scroll horizontal, com todos os botões visíveis e proporcionais
- A 768px+: layout atual de 3/4/6 colunas mantido sem alterações visuais
- Sem mudanças de business logic, apenas presentation
