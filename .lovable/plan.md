## Objetivo

Reorganizar os 4 botões de ação (Play, Favorito, Download, Fila) no `MusicCard` aplicando o estilo **Pill Control Bar** escolhido, deixando-os maiores e mais bem distribuídos para uso no mobile.

## Mudanças

### 1. `src/components/music/MusicCard.tsx` — linhas 96-132

Substituir a `div` que envolve os 4 botões por um layout com `flex` distribuído (`gap-2`), onde cada botão secundário usa `flex-1 aspect-square max-w-[52px]` e o Play é destacado com `flex-[1.6] h-12`.

- **Wrapper**: `flex items-center gap-2 w-full` (sem `ml-auto` no botão de fila — distribuição uniforme).
- **Play (primário)**: `flex-[1.6] h-11 sm:h-12 rounded-full bg-white text-black shadow-lg active:scale-95`, ícone `h-5 w-5`.
- **Favorito / Download / Fila (secundários)**: `flex-1 aspect-square max-w-[52px] rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-white/30 active:scale-90`, ícone `h-4 w-4 sm:h-[18px] sm:w-[18px]`.
- Estado ativo do favorito: preencher `Heart` com `fill-current text-red-500` quando favoritado (manter comportamento atual; só ajustar visual se já existir flag — caso contrário manter como está).
- Remover `ml-auto` do `AddToQueueButton` para que ele entre na mesma distribuição.

### 2. `src/components/music/AddToQueueButton.tsx` — linhas 48-53

Atualizar o `<button>` do `PopoverTrigger` para herdar o mesmo padrão dos secundários: `flex-1 aspect-square max-w-[52px] rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-white/30 active:scale-90`, ícone `h-4 w-4 sm:h-[18px] sm:w-[18px]`.

### 3. Comportamento de exibição

Manter a regra atual: no mobile sempre visível (`opacity-100`), no desktop só aparece em hover (`lg:opacity-0 lg:group-hover:opacity-100`). Sem mudança de lógica.

## Fora de escopo

- Sem alterações em business logic (handlers, store, hooks).
- Sem alterações em outras páginas/cards.
- Sem mudanças no layout do card (capa, título, artista).
