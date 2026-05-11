## Objetivo

Melhorar o `MusicPlayer` no mobile:
1. Corrigir o bug em que a lista (Popover) "pisca e some" ao tentar abrir.
2. Adicionar botão para esconder/mostrar o player (minimizar).
3. Aumentar o player no mobile e centralizar as ações mais usadas (anterior, play, próxima, lista).

## Mudanças

Tudo em `src/components/player/MusicPlayer.tsx`.

### 1. Corrigir o "piscar" da lista (Popover mobile)

Causa provável: o `PopoverTrigger` mobile (linhas 144-152) está dentro de um `motion.div` com animações e o Popover não tem `onOpenAutoFocus`/`onCloseAutoFocus` prevenidos como o desktop tem (linhas 302-303). Em mobile o autofocus do Radix devolve foco ao trigger animado e o `outside-click` detecta o toque inicial como clique fora, fechando imediatamente.

Correções:
- Adicionar `onOpenAutoFocus={(e) => e.preventDefault()}` e `onCloseAutoFocus={(e) => e.preventDefault()}` no `PopoverContent` mobile.
- Adicionar `collisionPadding={12}` e `avoidCollisions` para garantir posicionamento.
- Adicionar `modal={false}` no `<Popover>` mobile (e desktop) para evitar conflito com a `AnimatePresence` do player.
- Garantir `z-[70]` no `PopoverContent` (acima do player `z-[60]`).

### 2. Botão minimizar/expandir

Adicionar estado local `const [minimized, setMinimized] = useState(false)`.

- Quando `minimized = true`: renderizar uma barra fina (~48px) com apenas: capa (32px) + título truncado + botão Play/Pause + botão expandir (`ChevronUp`). Mantém-se fixa no rodapé.
- Quando `minimized = false`: layout completo atual (com melhorias do item 3).
- Botão `ChevronDown` adicionado no canto direito do layout completo (mobile e desktop) para minimizar.
- Substitui parcialmente o `X` (close): manter o `X` apenas no estado expandido como ação secundária. No estado minimizado, o `X` continua acessível ao lado do expand.

### 3. Player maior no mobile com ações centralizadas

Reorganizar a parte mobile (linhas 67-138 e 141-223):

**Nova estrutura mobile (vertical, ~140px de altura):**

```text
┌──────────────────────────────────────────┐
│ [capa 56] título / artista     ♥   ⌄  ✕ │  ← linha 1: info + favorito + minimizar + fechar
│ ─── slider de progresso ───              │  ← linha 2: progresso (00:00 / 03:21)
│        ⏮   ▶ (56px)   ⏭   ☰              │  ← linha 3: controles centrais grandes
└──────────────────────────────────────────┘
```

Especificações:
- Linha 1: capa `h-14 w-14`, info truncada, favorito (`Heart`), minimizar (`ChevronDown`), fechar (`X`).
- Linha 2: slider de progresso com timestamps `text-[10px]`.
- Linha 3: `flex items-center justify-center gap-6`:
  - `SkipBack` 24px (`h-6 w-6`)
  - Play/Pause em círculo `h-14 w-14` verde
  - `SkipForward` 24px
  - `ListMusic` 22px (abre o popover da fila)
- Remover do mobile: shuffle, repeat, volume slider (pouco usados em mobile). Mute fica acessível via `Volume2/VolumeX` opcional dentro do popover de lista ou removido por completo no mobile.
- Padding total `py-3 px-4`, `gap-2` entre linhas.

**Estado minimizado mobile (~52px):**
- `flex items-center gap-3 px-3 py-2`
- Capa 32px + título truncado + Play/Pause 36px + `ChevronUp` para expandir + `X` para fechar.

**Desktop:** manter o layout atual (3 colunas) sem grandes mudanças, apenas adicionar o botão minimizar (`ChevronDown`) ao lado do `X` no canto direito. No estado minimizado desktop, mesma barra fina centralizada.

### 4. Higiene

- Importar `ChevronDown`, `ChevronUp` do `lucide-react`.
- Sem mudanças no `playerStore` (apenas estado local de `minimized`).
- Sem mudanças em business logic (play/pause/next/previous continuam iguais).

## Fora de escopo

- Persistir estado `minimized` entre páginas/refresh.
- Mudanças no desktop além de adicionar o botão minimizar.
- Animações de transição entre minimizado/expandido (usar fade simples do `AnimatePresence` já existente).
