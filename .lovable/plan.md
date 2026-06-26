## Problema

No diálogo "Adicionar plano manualmente" (Admin → Assinaturas), o `Select` de plano abre **atrás** do conteúdo do `Dialog`. Causa: o `DialogContent` foi elevado para `z-[80]` (correção anterior para ficar acima do player mobile `z-[60]`), mas os componentes de overlay flutuante (Select, Popover, Dropdown, etc.) continuam em `z-50`. Resultado: qualquer popper aberto dentro de um Dialog fica por baixo.

## Solução

Subir o z-index de **todos os overlays do tipo popper** para ficarem acima do Dialog (`z-[80]`) e do overlay (`z-[75]`), mantendo a ordem visual correta.

Nova hierarquia:

```text
player fixo .............. z-[60]
DialogOverlay ............ z-[75]
DialogContent ............ z-[80]
Popper overlays (novo) ... z-[90]   ← Select, Popover, Dropdown, etc.
Toast/Sonner ............. z-[100]  (já é o topo)
```

## Arquivos a editar

Trocar `z-50` por `z-[90]` no Content de cada um destes (apenas no container raiz que faz portal — não em itens internos):

1. `src/components/ui/select.tsx` — `SelectContent`
2. `src/components/ui/popover.tsx` — `PopoverContent`
3. `src/components/ui/dropdown-menu.tsx` — `DropdownMenuContent` + `DropdownMenuSubContent`
4. `src/components/ui/tooltip.tsx` — `TooltipContent`
5. `src/components/ui/hover-card.tsx` — `HoverCardContent`
6. `src/components/ui/context-menu.tsx` — `ContextMenuContent` + `ContextMenuSubContent`
7. `src/components/ui/menubar.tsx` — `MenubarContent` + `MenubarSubContent`
8. `src/components/ui/command.tsx` — se houver `CommandDialog`/popover, ajustar

Não mexer em: `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx` (já corretos), nem em `toast.tsx`/`sonner.tsx` (devem ficar acima de tudo).

## Verificação

1. Abrir Admin → Assinaturas → "Adicionar plano" → clicar no Select "Plano": opções devem aparecer **acima** do diálogo.
2. Testar também: Select de status no mesmo diálogo, e qualquer outro Dropdown/Popover dentro de Dialogs (filtros admin, etc.).
3. Confirmar que no mobile o popper continua acima do player.

## Fora do escopo

Nenhuma mudança de lógica, dados ou estilo dos componentes — só z-index.
