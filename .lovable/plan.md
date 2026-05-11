## Problema

Toques duplicados ou bugs disparam `play()` mais de uma vez antes do primeiro terminar de carregar. Como `play()` é assíncrono e cria um novo `Audio` depois de `await getStreamUrl(...)`, duas instâncias podem tocar simultaneamente — incluindo a mesma música em paralelo.

### Causa raiz (em `src/stores/playerStore.ts`)

1. `cleanupAudio()` só limpa a variável `audio` no momento em que roda. Se a chamada A está aguardando `getStreamUrl`, a chamada B entra, faz `cleanupAudio()` (não há nada para limpar ainda) e cria seu próprio `Audio`. Quando A retorna, ela também atribui `audio = new Audio(...)` e dá `audio.play()`. Ambas tocam.
2. Não há proteção contra cliques repetidos no mesmo track enquanto está em `isLoading`.
3. URLs criadas com `URL.createObjectURL` nunca são revogadas — vazam memória além do bug de overlap.

## Mudanças

Tudo em `src/stores/playerStore.ts`.

### 1. Token de execução por chamada (`playToken`)

- Adicionar contador module-scoped `let playToken = 0`.
- No início de `play()`: `const myToken = ++playToken`.
- Após cada `await` (busca de stream URL e `audio.play()`), verificar `if (myToken !== playToken) { /* abort: revoke blob, dispose audio */ return }`.
- Isso garante que apenas a chamada mais recente "vence". Chamadas anteriores abortam silenciosamente sem tocar.

### 2. Cleanup robusto

- `cleanupAudio()` passa a:
  - Remover listeners (guardar refs ou usar `audio.onloadedmetadata = null`, `onended = null`, `onerror = null`).
  - `audio.pause()`, `audio.src = ""`, `audio.load()` (força reset).
  - Revogar blob URL anterior se existir (`URL.revokeObjectURL(prevSrc)` quando começar com `blob:`).
  - Limpar `progressInterval`.
- Guardar a URL atual em `let currentBlobUrl: string | null = null` para revogar corretamente.

### 3. Guarda anti-toque-duplo

- No início de `play()`: se `isLoading === true` E `currentTrack?.id === track.id`, retornar imediatamente (ignora cliques repetidos no mesmo track durante o carregamento).
- Se `currentTrack?.id === track.id` E `!isLoading` E o áudio existe, em vez de recriar tudo, apenas dar `seek(0)` + `audio.play()` (reinicia a faixa atual sem disparar novo download/Audio).

### 4. Cleanup antes do await

- Mover `cleanupAudio()` para ANTES de qualquer `await`, e setar `isLoading: true` imediatamente. Isso garante que qualquer Audio anterior seja parado antes de começar o trabalho assíncrono.

## Fora de escopo

- Mudanças visuais no player.
- Mudanças no comportamento de `next/previous/queue`.
- Persistência de estado.
