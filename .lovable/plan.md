## Objetivo

Permitir alternar entre visualização de pastas em **Grade** (atual) e **Lista** (largura cheia, mostra o nome da pasta completo).

## Mudanças

Tudo em `src/pages/RepertorioPage.tsx`.

### 1. Estado e toggle

- Adicionar `const [folderViewMode, setFolderViewMode] = useState<"grid" | "list">("grid")`.
- Persistir em `localStorage` com chave `repertorio:folderViewMode` (read no init, write no toggle) para manter a preferência do usuário.
- Adicionar um pequeno toggle de duas opções acima do grid de pastas (linha ~624), à direita: dois botões com ícones `LayoutGrid` e `List` (lucide-react), mostrando o ativo com `bg-primary/10` e `text-primary`.

### 2. Renderização condicional

Substituir o bloco do grid de subpastas (linhas 625-658) por:

- Wrapper que adapta classes:
  - `grid` mode: classes atuais (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3`).
  - `list` mode: `flex flex-col gap-2 w-full`.
- Cada item (`Button`):
  - `grid` mode: classes atuais.
  - `list` mode: `w-full justify-start gap-3 px-4 py-3` e remover `truncate` do `<span>` (trocar por `whitespace-normal break-words text-left`) para permitir nome completo em múltiplas linhas; ou `truncate` removido só nesse modo.
  - Ícone `FolderOpen` mantém-se à esquerda; contador de músicas vai à direita (em list mode usar `ml-auto shrink-0`).

### 3. Acessibilidade

- Botões do toggle com `aria-label` ("Visualizar em grade" / "Visualizar em lista") e `aria-pressed`.

## Fora de escopo

- Mudar o grid de músicas (apenas pastas).
- Mudanças em business logic, navegação ou store.
