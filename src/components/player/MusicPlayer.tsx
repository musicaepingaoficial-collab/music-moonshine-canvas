import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2, X, ListMusic } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/playerStore";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const handlePlayPause = () => {
    isPlaying ? pause() : resume();
  };

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="player-bar fixed bottom-0 left-0 right-0 z-[60] flex h-24 md:h-20 flex-col md:flex-row items-center px-4 py-2 md:py-0 md:px-6 border-t border-border/40 bg-background/95 backdrop-blur-lg"
        >
          <div className="flex w-full md:w-auto min-w-0 md:flex-1 items-center gap-3">
            <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 overflow-hidden rounded-md bg-secondary">
              {currentTrack.cover_url ? (
                <img
                  src={currentTrack.cover_url}
                  alt={`Capa de ${currentTrack.title}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Play className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs md:text-sm font-medium text-foreground">
                {currentTrack.title}
              </p>
              <p className="truncate text-[10px] md:text-xs text-muted-foreground">
                {currentTrack.artist}
              </p>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={handlePlayPause}
                disabled={isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-3.5 w-3.5" fill="currentColor" />
                ) : (
                  <Play className="h-3.5 w-3.5 translate-x-0.5" fill="currentColor" />
                )}
              </button>
              <button onClick={close} className="text-muted-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex w-full md:flex-1 flex-col items-center gap-0.5 md:gap-1 mt-1 md:mt-0">
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={previous}
                className="text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-1"
                aria-label="Música anterior"
              >
                <SkipBack className="h-4 w-4" fill="currentColor" />
              </button>
              <button
                onClick={handlePlayPause}
                disabled={isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                aria-label={isPlaying ? "Pausar" : "Tocar"}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" fill="currentColor" />
                ) : (
                  <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
                )}
              </button>
              <button
                onClick={next}
                className="text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-1"
                aria-label="Próxima música"
              >
                <SkipForward className="h-4 w-4" fill="currentColor" />
              </button>
            </div>
            <div className="flex w-full max-w-md items-center gap-2">
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[progress]}
                onValueChange={([v]) => setProgress(v)}
                max={100}
                step={0.1}
                className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-foreground"
                aria-label="Progresso da música"
              />
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume + Close */}
          <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
            <Popover open={isQueueOpen} onOpenChange={setIsQueueOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-2 ${isQueueOpen ? 'text-primary' : ''}`}
                  aria-label="Ver lista de reprodução"
                >
                  <ListMusic className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80 p-0 mr-4 bg-background/95 backdrop-blur-lg border-border" 
                align="end" 
                side="top" 
                sideOffset={10}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="p-3 border-b border-border/50">
                  <h3 className="font-semibold text-sm">Lista de Reprodução</h3>
                  <p className="text-[10px] text-muted-foreground">{queue.length} músicas na fila</p>
                </div>
                <ScrollArea className="h-64">
                  <div className="p-2 space-y-1">
                    {queue.map((track, i) => (
                      <div
                        key={`${track.id}-${i}`}
                        onClick={() => {
                          play(track);
                          setIsQueueOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left cursor-pointer ${currentTrack.id === track.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
                      >
                        <div className="h-8 w-8 shrink-0 rounded overflow-hidden bg-muted">
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
                          <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                        </div>
                        {currentTrack.id === track.id && (
                          <div className="flex gap-0.5">
                            <div className="w-0.5 h-2 bg-primary animate-music-bar-1" />
                            <div className="w-0.5 h-2 bg-primary animate-music-bar-2" />
                            <div className="w-0.5 h-2 bg-primary animate-music-bar-3" />
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
              className="text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-1"
              aria-label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Slider
              value={muted ? [0] : [volume]}
              onValueChange={([v]) => setVolume(v)}
              max={100}
              step={1}
              className="w-24 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-foreground"
              aria-label="Volume"
            />
            <button
              onClick={close}
              className="ml-2 text-muted-foreground transition-all duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-full p-1"
              aria-label="Fechar reprodutor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex md:hidden absolute -top-10 right-4">
             <Popover open={isQueueOpen} onOpenChange={setIsQueueOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-background/95 backdrop-blur-lg border border-border/50 text-foreground shadow-lg"
                  aria-label="Lista"
                >
                  <ListMusic className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[90vw] max-w-sm p-0 mb-4 bg-background/95 backdrop-blur-lg border-border" 
                align="end" 
                side="top" 
                sideOffset={10}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="p-3 border-b border-border/50">
                  <h3 className="font-semibold text-sm">Lista de Reprodução</h3>
                  <p className="text-[10px] text-muted-foreground">{queue.length} músicas na fila</p>
                </div>
                <ScrollArea className="h-64">
                  <div className="p-2 space-y-1">
                    {queue.map((track, i) => (
                      <div
                        key={`${track.id}-${i}`}
                        onClick={() => {
                          play(track);
                          setIsQueueOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left cursor-pointer ${currentTrack.id === track.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
                      >
                        <div className="h-8 w-8 shrink-0 rounded overflow-hidden bg-muted">
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
                          <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
