## Objetivo
Hoje, na página do Repertório (`/repertorio/:id`), o botão de alternar entre grade e lista existe, mas afeta **apenas a exibição das subpastas**. As músicas dentro da pasta selecionada continuam sempre em grade. Queremos que o mesmo toggle também controle a exibição das músicas, permitindo ver a lista de faixas em formato compacto (linha), igual ao usado na busca da Biblioteca.

## Escopo
Somente frontend, arquivo `src/pages/RepertorioPage.tsx`. Reaproveitando o componente já existente `src/components/music/MusicListRow.tsx`.

## Mudanças

1. **Reutilizar o estado `folderViewMode`** (já persistido em `localStorage: repertorio:folderViewMode`) para também controlar o layout das músicas — mantém uma única preferência do usuário para "pastas + músicas".

2. **Ajustar `renderMusicGrid(tracks)`** para renderizar condicionalmente:
   - `folderViewMode === "grid"` → mantém o grid atual com `MusicCard` (2/3/4/6 colunas).
   - `folderViewMode === "list"` → renderiza uma lista vertical usando `MusicListRow` (import novo), dentro de um container `divide-y border rounded-xl` — idêntico ao padrão da busca da Biblioteca.
   - Renomear a função para `renderMusicItems` para refletir os dois modos.

3. **Reposicionar o toggle grid/lista** para ficar sempre visível quando existir conteúdo (subpastas ou músicas):
   - Hoje o toggle só aparece dentro do bloco `currentLevelFolders.length > 0`.
   - Mover o botão para o cabeçalho da seção de músicas (linha com "Músicas em …" + "Baixar pasta"), assim ele aparece mesmo quando a pasta selecionada não tem subpastas — que é justamente o cenário em que o usuário quer ver a lista de faixas.
   - Se ainda existirem subpastas no nível atual, elas continuam respeitando o mesmo `folderViewMode` (comportamento atual preservado).

4. **Animação**: manter o `motion.div` com stagger no modo grid; no modo lista aplicar o mesmo stagger em cada `MusicListRow` para transição suave.

5. **Acessibilidade**: preservar `aria-pressed`, `aria-label="Visualizar em grade"` / `"Visualizar em lista"` no toggle.

## Fora do escopo
- Não altera `MeusRepertoriosPage` (grid de capas dos repertórios).
- Não altera `MusicCard`, `MusicListRow`, nem lógica de player, download ou paginação.
- Sem mudanças de backend, migrations ou tipos.

## Critérios de aceite
- Abrir um repertório → clicar no ícone de lista → subpastas E músicas ficam em lista.
- Preferência persiste ao recarregar a página (localStorage).
- Ao entrar numa pasta sem subpastas, o toggle continua visível e funcional para as músicas.
- Layout responsivo mantido em mobile (sem overflow horizontal).
