## Problema

Em `src/components/player/MusicPlayer.tsx` há dois componentes `<Popover>` (mobile e desktop) compartilhando o mesmo estado `isQueueOpen`. Mesmo com o trigger desktop escondido por `hidden md:flex`, o Radix Popover continua montado e renderiza o `PopoverContent` via portal — resultando em duas listas de reprodução sobrepostas no mobile.

## Mudanças

Em `src/components/player/MusicPlayer.tsx`:

1. Remover o estado único `const [isQueueOpen, setIsQueueOpen] = useState(false)`.
2. Criar dois estados independentes: `isMobileQueueOpen` e `isDesktopQueueOpen`.
3. Ligar cada `<Popover>` ao respectivo par `open` / `onOpenChange`.
4. Atualizar `renderQueueContent` para receber um callback `onClose: () => void` e usar esse callback no `onClick` da faixa (em vez de chamar `setIsQueueOpen(false)` diretamente).
5. Cada Popover passa seu próprio setter como `onClose`:
   - mobile: `renderQueueContent(() => setIsMobileQueueOpen(false))`
   - desktop: `renderQueueContent(() => setIsDesktopQueueOpen(false))`
6. Atualizar a classe condicional do trigger (`isQueueOpen ? ... : ...`) para usar o estado correspondente em cada lado.

## Fora de escopo

- Mudanças em store, layout, animações ou business logic.
