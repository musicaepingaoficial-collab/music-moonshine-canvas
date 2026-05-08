import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2, X, ListMusic, Trash2, Eraser, Heart, Shuffle, Repeat, Maximize2, MonitorSpeaker, Music2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/playerStore";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFavoritos, useToggleFavorito } from "@/hooks/useFavorites";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MusicPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);

  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const close = usePlayerStore((s) => s.close);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const { data: favoritos = [] } = useFavoritos();
  const toggleFav = useToggleFavorito();
  const isFavorite = currentTrack ? favoritos.some((f: any) => f.musica_id === currentTrack.id) : false;

  const handlePlayPause = () => {
    isPlaying ? pause() : resume();
  };

  // Custom slider class with green accent
  const greenSliderClass = "[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-md [&>span:first-child]:bg-white/15 [&>span:first-child>span]:bg-[hsl(142,76%,55%)]";

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="player-bar fixed bottom-0 left-0 right-0 z-[60] flex flex-col md:flex-row items-stretch md:items-center px-3 md:px-5 py-2 md:py-3 gap-2 md:gap-4 border-t border-[hsl(142,76%,40%)]/30 bg-gradient-to-r from-[#0a0f0a] via-[#0d1410] to-[#0a0f0a] backdrop-blur-xl shadow-[0_-8px_32px_-8px_rgba(34,197,94,0.25)]"
        >
          {/* LEFT: Cover + Title + Heart */}
          <div className="flex w-full md:w-[28%] min-w-0 items-center gap-3">
            <div className="h-12 w-12 md:h-14 md:w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[hsl(142,76%,25%)] to-[hsl(142,76%,15%)] ring-1 ring-[hsl(142,76%,45%)]/40 shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)] flex items-center justify-center">
              {currentTrack.cover_url ? (
                <img
                  src={currentTrack.cover_url}
                  alt={`Capa de ${currentTrack.title}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Music2 className="h-6 w-6 text-[hsl(142,76%,55%)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {currentTrack.title}
              </p>
              <p className="truncate text-xs text-[hsl(142,76%,55%)]">
                {currentTrack.artist}
              </p>
            </div>
            <button
              onClick={() => currentTrack && toggleFav.mutate(currentTrack.id)}
              className="hidden md:flex shrink-0 items-center justify-center rounded-full p-2 transition-all duration-200 hover:scale-110"
              aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Heart
                className={`h-5 w-5 transition-colors ${isFavorite ? "fill-[hsl(142,76%,55%)] text-[hsl(142,76%,55%)]" : "text-white/60 hover:text-white"}`}
              />
            </button>

            {/* Mobile play + close */}
            <div className="flex items-center gap-1 md:hidden">
              <button
                onClick={() => currentTrack && toggleFav.mutate(currentTrack.id)}
                className="p-1.5"
                aria-label="Favoritar"
              >
                <Heart className={`h-5 w-5 ${isFavorite ? "fill-[hsl(142,76%,55%)] text-[hsl(142,76%,55%)]" : "text-white/60"}`} />
              </button>
              <button
                onClick={handlePlayPause}
                disabled={isLoading}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(142,76%,55%)] text-black shadow-[0_0_18px_-2px_rgba(34,197,94,0.7)]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
                )}
              </button>
              <button onClick={close} className="text-white/60 p-1.5" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* CENTER: Controls + Progress */}
          <div className="flex w-full md:flex-1 flex-col items-center gap-1.5">
            <div className="hidden md:flex items-center gap-5">
              <button
                onClick={() => setShuffle((v) => !v)}
                className={`transition-all duration-200 hover:scale-110 ${shuffle ? "text-[hsl(142,76%,55%)]" : "text-white/60 hover:text-white"}`}
                aria-label="Aleatório"
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                onClick={previous}
                className="text-white/80 transition-all duration-200 hover:text-white hover:scale-110"
                aria-label="Música anterior"
              >
                <SkipBack className="h-5 w-5" fill="currentColor" />
              </button>
              <button
                onClick={handlePlayPause}
                disabled={isLoading}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(142,76%,55%)] text-black shadow-[0_0_24px_-2px_rgba(34,197,94,0.7)] transition-all duration-200 hover:scale-105 hover:bg-[hsl(142,76%,60%)] disabled:opacity-50"
                aria-label={isPlaying ? "Pausar" : "Tocar"}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" fill="currentColor" />
                ) : (
                  <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
                )}
              </button>
              <button
                onClick={next}
                className="text-white/80 transition-all duration-200 hover:text-white hover:scale-110"
                aria-label="Próxima música"
              >
                <SkipForward className="h-5 w-5" fill="currentColor" />
              </button>
              <button
                onClick={() => setRepeat((v) => !v)}
                className={`transition-all duration-200 hover:scale-110 ${repeat ? "text-[hsl(142,76%,55%)]" : "text-white/60 hover:text-white"}`}
                aria-label="Repetir"
              >
                <Repeat className="h-4 w-4" />
              </button>
            </div>
            <div className="flex w-full max-w-xl items-center gap-2">
              <span className="text-[10px] tabular-nums text-white/50 w-9 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[progress]}
                onValueChange={([v]) => setProgress(v)}
                max={100}
                step={0.1}
                className={`flex-1 ${greenSliderClass}`}
                aria-label="Progresso da música"
              />
              <span className="text-[10px] tabular-nums text-white/50 w-9">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* RIGHT: Queue + Volume + Extras */}
          <div className="hidden md:flex md:w-[28%] items-center justify-end gap-3">
            <Popover open={isQueueOpen} onOpenChange={setIsQueueOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`transition-all duration-200 hover:scale-110 ${isQueueOpen ? 'text-[hsl(142,76%,55%)]' : 'text-white/70 hover:text-white'}`}
                  aria-label="Ver lista de reprodução"
                >
                  <ListMusic className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 md:w-96 p-0 mr-4 bg-[#0d1410]/95 backdrop-blur-lg border-[hsl(142,76%,40%)]/30"
                align="end"
                side="top"
                sideOffset={10}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="p-3 border-b border-[hsl(142,76%,40%)]/20 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-white">Lista de Reprodução</h3>
                    <p className="text-[10px] text-white/50">{queue.length} músicas na fila</p>
                  </div>
                  {queue.length > 1 && (
                    <button
                      onClick={clearQueue}
                      className="text-xs text-white/60 hover:text-destructive flex items-center gap-1 transition-colors"
                      title="Limpar lista"
                    >
                      <Eraser className="h-3 w-3" />
                      Limpar
                    </button>
                  )}
                </div>
                <ScrollArea className="h-64 md:h-80">
                  <div className="p-2 space-y-1">
                    {queue.map((track, i) => (
                      <div
                        key={`${track.id}-${i}`}
                        onClick={() => {
                          play(track);
                          setIsQueueOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left cursor-pointer ${currentTrack.id === track.id ? 'bg-[hsl(142,76%,45%)]/15 text-[hsl(142,76%,55%)]' : 'hover:bg-white/5 text-white/90'}`}
                      >
                        <div className="h-8 w-8 shrink-0 rounded overflow-hidden bg-white/5">
                          {track.cover_url ? (
                            <img src={track.cover_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Play className="h-3 w-3 opacity-50" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{track.title}</p>
                          <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(track.id);
                          }}
                          className="p-1.5 text-white/50 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Remover da lista"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {currentTrack.id === track.id && (
                          <div className="flex gap-0.5">
                            <div className="w-0.5 h-2 bg-[hsl(142,76%,55%)] animate-music-bar-1" />
                            <div className="w-0.5 h-2 bg-[hsl(142,76%,55%)] animate-music-bar-2" />
                            <div className="w-0.5 h-2 bg-[hsl(142,76%,55%)] animate-music-bar-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <button
              onClick={toggleMute}
              className="text-white/70 transition-all duration-200 hover:text-white hover:scale-110"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <Slider
              value={muted ? [0] : [volume]}
              onValueChange={([v]) => setVolume(v)}
              max={100}
              step={1}
              className={`w-24 ${greenSliderClass}`}
              aria-label="Volume"
            />

            <button
              onClick={close}
              className="ml-1 text-white/60 transition-all duration-200 hover:text-white hover:scale-110"
              aria-label="Fechar reprodutor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
