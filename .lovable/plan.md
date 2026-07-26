## O que muda

Hoje a **Biblioteca** (`/biblioteca`) só mostra repertórios em grade — não tem campo de busca. A busca do topo (`Header`) apenas navega para a página de detalhes da música. O usuário quer transformar a Biblioteca num buscador estilo **YouTube Music**: digitar e ver resultados que já dão pra tocar direto.

## Mudanças (frontend apenas)

### `src/pages/BibliotecaPage.tsx`

- Adicionar barra de busca fixa no topo (abaixo do `Banner`), full-width, com ícone `Search`, `X` para limpar e placeholder "Buscar músicas, artistas...".
- Estado local `searchTerm` com debounce de 250 ms (`useEffect` + `setTimeout`).
- Enquanto `searchTerm.trim().length < 2` → renderiza a **view atual** (Destaques + Todos os Repertórios).
- Quando `searchTerm.trim().length >= 2` → renderiza a **view de resultados**:
  - Query direta ao Supabase: `.from("musicas").select("*").or("title.ilike.%X%,artist.ilike.%X%").order("title").limit(60)`.
  - Loading: `MusicGridSkeleton count={12}`.
  - Zero resultados: `EmptyState` com ícone `Search` e mensagem "Nenhuma música encontrada para '<termo>'".
  - Com resultados: grid de `MusicCard` (reutiliza o componente que já toca, baixa, favorita e usa `queueContext`).
  - **Fila para autoplay**: passar `queueContext` = todas as músicas retornadas para o `MusicCard`, assim ao dar play em uma, a fila do player se enche com os resultados da busca e as próximas tocam sozinhas (como no YouTube Music).
  - Cabeçalho da seção: "X resultados para '<termo>'" + botão "Tocar tudo" que dispara `usePlayerStore.play(resultados[0], resultados)`.

### `src/components/layout/Header.tsx`

- Nenhuma mudança funcional obrigatória. Opcional: quando o usuário clicar num resultado do dropdown do Header, em vez de navegar para `/musica/:id`, chamar `usePlayerStore.play(track)` direto para consistência com a Biblioteca. **Decisão:** manter o comportamento atual do Header (navegar para detalhes) — só a Biblioteca vira "buscador YouTube Music". Se você quiser trocar depois, é uma linha.

### Reutilização

- `MusicCard` já suporta `queueContext` e `play`.
- `MusicGridSkeleton`, `EmptyState`, `ErrorState`, `Input`, `Search`, `X` já existem no projeto.
- `useMusicas` **não** vai ser usado para a busca (traz tudo e filtra no cliente = pesado). Vou fazer query dedicada no Supabase com `ilike`, que é como o Header já faz.

## Detalhes técnicos

- Debounce: 250 ms — mesmo padrão do Header.
- Limite: 60 resultados (`.limit(60)`). Cobre 99% dos casos sem paginação. Se quiser paginar depois, adiciono botão "Carregar mais".
- Sem `useQuery` — usar `useEffect` + `useState` para manter simples e evitar cache de chaves dinâmicas explodindo o React Query.
- Cancelamento: usar um flag `cancelled` no efeito para descartar resposta antiga se o usuário continuar digitando.
- Sem alterações no store do player, no Supabase, nem em nenhuma outra página.

## O que NÃO vou fazer

- Não vou mexer no player, no PWA nem nas rotas.
- Não vou adicionar histórico de busca, sugestões, autocomplete ou trending — dá pra fazer numa próxima iteração se quiser.
- Não vou tocar no dropdown do Header (comportamento fica).

Arquivo único alterado: `src/pages/BibliotecaPage.tsx`.
