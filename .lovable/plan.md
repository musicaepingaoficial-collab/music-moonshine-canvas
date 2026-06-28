# Plano: Player para de reproduzir após 2 músicas

## Diagnóstico

Em `src/stores/playerStore.ts`, cada nova faixa cria um `new Audio(src)` totalmente novo dentro de `play()` (chamado pelo `onended → next()`). Isso quebra a **"transient activation"** do navegador:

1. Faixa 1 toca porque o usuário clicou (gesto válido).
2. Quando a faixa 1 termina, `onended` chama `next()` → `play()` → `cleanupAudio()` destrói o `<audio>` antigo e cria **outro elemento `Audio` novo**. Como ainda estamos dentro do callback do `ended` (gesto "herdado"), Chrome/Safari normalmente permitem o `.play()`. A faixa 2 toca.
3. Quando a faixa 2 termina, o gesto original já expirou. O `localAudio.play()` retorna uma Promise **rejeitada** com `NotAllowedError` (autoplay policy), especialmente no mobile/Safari. O `catch` define `isPlaying: false, isLoading: false` mas o usuário só vê o player "parado". Ao clicar de novo, há um novo gesto → toca normalmente.

Sintomas que confirmam: para sempre na 3ª faixa, basta um clique para continuar, console pode mostrar `NotAllowedError` ou `The play() request was interrupted`.

Causa raiz: **trocar o elemento `<audio>` a cada faixa** descarta a ativação do usuário. A correção padrão é **reutilizar um único `HTMLAudioElement`** durante toda a sessão e apenas trocar o `src`.

## Mudanças (apenas `src/stores/playerStore.ts`)

### 1. Criar um `<audio>` único e persistente
- Substituir o `let audio: HTMLAudioElement | null` por uma função `getAudio()` que cria **uma vez** (lazy) e reusa sempre o mesmo elemento.
- Setar `audio.preload = "auto"` e `audio.crossOrigin` se necessário.

### 2. Reescrever `cleanupAudio()` como "reset"
Em vez de destruir o elemento:
- Limpar `progressInterval`.
- Pausar o áudio (`audio.pause()`), remover `src` somente quando o usuário fecha o player (`close()`), **não** entre faixas.
- Revogar o `currentBlobUrl` anterior depois que o novo blob estiver pronto.
- Em `play()`, em vez de `cleanupAudio()` completo, fazer apenas `audio.pause()` e limpar listeners/intervalo.

### 3. Trocar apenas o `src`
Dentro de `play()`:
```ts
const el = getAudio();
el.pause();
clearInterval(progressInterval);
el.src = src;                 // reaproveita a transient activation
el.load();
el.volume = muted ? 0 : volume / 100;
// re-anexar onloadedmetadata / onended / onerror
await el.play();
```

### 4. Tratar `NotAllowedError` explicitamente
No `catch` do `play()`:
- Se `err.name === "NotAllowedError"`, manter `currentTrack` e `isPlaying: false`, emitir `toast("Toque em ▶ para continuar")` e disparar um evento `player:needs-gesture` para a UI poder destacar o botão play.
- Para outros erros, comportamento atual.

### 5. Revogar blobs sem matar o elemento
Manter `currentBlobUrl` como antes, mas só revogar **depois** que o novo `src` foi atribuído e `loadedmetadata` disparou, evitando o glitch de revogar enquanto o `<audio>` ainda lê dele.

### 6. `close()` agora é o único que destrói
`close()` chama um `destroyAudio()` real (remove src, `load()`, zera ref). Isso preserva semântica do botão fechar.

## Validação

1. Tocar uma playlist de 5+ faixas e deixar rodar do início ao fim sem clicar. Antes: para na 3ª. Depois: toca todas.
2. No mobile (Chrome Android e Safari iOS) repetir o teste — é onde a autoplay policy é mais agressiva.
3. Verificar que `Next/Previous` manuais continuam funcionando.
4. Verificar que o botão fechar (`close()`) realmente para e libera memória.
5. Conferir DevTools → Network: só 1 request por faixa (sem duplicar por causa de re-criação do `<audio>`).
6. Conferir console: não deve haver mais `NotAllowedError` no fluxo automático após a primeira faixa.

## Riscos

- Reutilizar `<audio>` exige re-anexar listeners a cada troca de `src` (limpando os antigos) para não acumular.
- Garantir que `playToken` continue invalidando carregamentos em andamento quando o usuário pula faixas rapidamente.
- Em iOS, `el.load()` após mudar `src` é obrigatório — incluir sempre.
