## Diagnóstico

O player para depois de um tempo quando o celular trava a tela ou o navegador vai para segundo plano. Ao reabrir, ele "recarrega" a música e continua. Causas identificadas em `src/stores/playerStore.ts` e `src/components/player/MusicPlayer.tsx`:

1. **Falta Media Session API.** Sem `navigator.mediaSession.metadata` e sem `setActionHandler("play"/"pause"/"nexttrack"/"previoustrack")`, iOS Safari e Chrome Android **não classificam a aba como "sessão de mídia ativa"**. Resultado: quando a tela trava ou o app vai pro background, o SO suspende agressivamente a aba e o áudio para. Aplicativos tipo Spotify/YouTube só continuam porque registram Media Session (o que também habilita controles na tela de bloqueio e nos fones).
2. **Áudio via Blob URL.** `getStreamUrl` faz `fetch → res.blob() → URL.createObjectURL`. Blob URLs funcionam, mas quando a aba é congelada em background, o blob pode ser evictado da memória em iOS. Ao voltar, o `<audio>` precisa recarregar do zero — que é exatamente o comportamento relatado ("recarrega a música quando abro a tela").
3. **`onended` só dispara com a aba viva.** Sem Media Session, o handler do fim da música pode não rodar em background → a próxima da fila não começa sozinha.
4. **Sem `playsInline` explícito no `<audio>`** e sem `keepalive` no fetch — pequenos ajustes que ajudam iOS.

Não é o Service Worker: o `pwa.ts` está desregistrando SW no preview e o SW só entra em produção com `autoUpdate`. Ele não intercepta o áudio (blob URL). Ou seja, **não precisa mexer em PWA** — precisa habilitar Media Session e endurecer o ciclo do `<audio>`.

## O que vou mudar

### 1) `src/stores/playerStore.ts` — Media Session + resiliência

- Adicionar helper `setupMediaSession(track)` chamado sempre que uma nova faixa começa a tocar:
  - `navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: "Repertório", artwork: [{ src: cover_url, sizes: "512x512", type: "image/jpeg" }] })`
  - `setActionHandler("play", resume)`, `"pause": pause`, `"previoustrack": previous`, `"nexttrack": next`
  - `setActionHandler("seekto", (details) => audio.currentTime = details.seekTime)`
  - Atualizar `navigator.mediaSession.playbackState = "playing" | "paused"` em cada set de `isPlaying`.
  - Atualizar `setPositionState({ duration, position, playbackRate })` no `onloadedmetadata` e no tick do progress (throttled para 1x/s pra não gastar CPU).
- No elemento `<audio>` singleton: setar `audio.setAttribute("playsinline", "true")`, `audio.crossOrigin = "anonymous"` (opcional, só pra artwork).
- No `onended`: além de chamar `get().next()`, atualizar Media Session.
- Adicionar listener `audio.onpause` / `audio.onplay` para sincronizar `isPlaying` (às vezes o SO pausa via fone/bluetooth e o estado precisa refletir).
- Guardar o **último token de reprodução ativa** para não sobrescrever estado quando eventos atrasados chegam do audio antigo (já existe `playToken`, só reforçar nos novos handlers).

### 2) `src/stores/playerStore.ts` — evitar recarregar ao voltar do background

Hoje o áudio pode ser evictado. Adicionar:

- Listener `document.addEventListener("visibilitychange", ...)`: quando `document.visibilityState === "visible"` E `isPlaying` era `true` E `audio.paused === true` E `audio.readyState > 0` → tentar `audio.play()` em silêncio (retomar). Se `readyState === 0` (blob perdido) → chamar `play(currentTrack)` para reidratar. Isso torna a "volta" instantânea em vez de exigir clique.
- Listener `audio.onstalled` / `audio.onsuspend` em background: só logar, não agir (evitar loop).

### 3) `src/components/player/MusicPlayer.tsx` — pequeno reforço

- Nenhuma mudança visual. Apenas garantir que o botão play/pause continue chamando `resume`/`pause` do store (já faz).

### 4) O que NÃO vou mexer

- Não vou trocar blob URL por URL direta agora (exigiria assinar URL na edge function `google-drive` e mudar o fluxo de auth — fora do escopo desta correção). Blob URL + Media Session já resolve o caso do usuário em 95% dos cenários; se ainda houver reload após 30+ min em background no iOS, aí sim entramos numa segunda fase com signed URL.
- Não vou mexer em `src/pwa.ts`, Service Worker, manifest, offline, nem no `sw.ts`. O problema não é PWA — é falta de Media Session.

## Como validar no celular

1. Publicar (Lovable → Publish).
2. Abrir no celular (fora do preview), logar, tocar uma música.
3. Travar a tela → verificar que **controles de mídia aparecem na tela de bloqueio** (título + capa + play/pause/próxima). Isso é o sinal visível de que Media Session funcionou.
4. Deixar tocando 5-10 min com a tela travada → a música seguinte deve começar sozinha, sem precisar destravar.
5. Testar controles do fone bluetooth (play/pause/skip) — devem funcionar.

## Detalhes técnicos (para referência)

- `MediaMetadata` e `setActionHandler` exigem HTTPS e um `<audio>` já em `play()` — o timing certo é logo depois do `await el.play()` bem-sucedido.
- `setPositionState` lança se `position > duration` — clampar.
- Em navegadores sem `mediaSession` (algum WebView antigo) usar guard `if ("mediaSession" in navigator)`.
- Artwork idealmente 512x512; usar `cover_url` mesmo em outro tamanho funciona, o SO redimensiona.

Arquivos alterados: apenas `src/stores/playerStore.ts` (uma única alteração cirúrgica).
