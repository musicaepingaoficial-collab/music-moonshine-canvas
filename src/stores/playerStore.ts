import { create } from "zustand";
import type { Musica } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Single, persistent <audio> element — reusing it across tracks preserves
// the browser's transient user activation, so autoplay-after-ended keeps
// working past the 2nd track on Chrome/Safari/iOS.
let audio: HTMLAudioElement | null = null;
let progressInterval: ReturnType<typeof setInterval> | null = null;
let currentBlobUrl: string | null = null;
let playToken = 0;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
  }
  return audio;
}

function clearProgress() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function detachListeners(el: HTMLAudioElement) {
  el.onloadedmetadata = null;
  el.onended = null;
  el.onerror = null;
}

function resetForNextTrack() {
  clearProgress();
  if (audio) {
    try {
      detachListeners(audio);
      audio.pause();
    } catch {}
  }
}

function destroyAudio() {
  clearProgress();
  if (audio) {
    try {
      detachListeners(audio);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {}
    audio = null;
  }
  if (currentBlobUrl) {
    try { URL.revokeObjectURL(currentBlobUrl); } catch {}
    currentBlobUrl = null;
  }
}

async function getStreamUrl(fileId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/google-drive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey,
    },
    body: JSON.stringify({ action: "stream", fileId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("[Player:getStreamUrl] Error:", res.status, errorData);
    if (errorData?.code === "DEMO_LIMIT" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("demo:gate", { detail: { reason: "plays" } }));
    }
    const err: any = new Error(errorData.error || "Falha ao obter áudio");
    err.code = errorData?.code;
    throw err;
  }

  const blob = await res.blob();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("demo:play-consumed"));
  }
  return URL.createObjectURL(blob);
}

interface PlayerState {
  currentTrack: Musica | null;
  queue: Musica[];
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  isLoading: boolean;

  play: (track: Musica, queueContext?: Musica[]) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  close: () => void;
  setQueue: (tracks: Musica[]) => void;
  addToQueue: (track: Musica) => void;
  removeFromQueue: (trackId: string) => void;
  playNext: (track: Musica) => void;
  clearQueue: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setProgress: (p: number) => void;
  setDuration: (d: number) => void;
  seek: (percent: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: 75,
  muted: false,
  progress: 0,
  duration: 0,
  currentTime: 0,
  isLoading: false,

  play: async (track, queueContext) => {
    const { queue, volume, muted, currentTrack, isLoading } = get();

    // Anti double-tap: ignore repeated clicks while same track is loading
    if (isLoading && currentTrack?.id === track.id) {
      return;
    }

    // Same track already loaded → just restart instead of recreating audio
    if (!isLoading && currentTrack?.id === track.id && audio && !queueContext) {
      try {
        audio.currentTime = 0;
        await audio.play();
        set({ isPlaying: true, progress: 0, currentTime: 0 });
      } catch (err) {
        console.error("[Player] Restart error:", err);
      }
      return;
    }

    // Claim ownership of this play invocation
    const myToken = ++playToken;

    // Soft reset (keep the <audio> element alive to preserve user activation)
    resetForNextTrack();

    // If a new queue context is provided, update the queue
    if (queueContext && queueContext.length > 0) {
      set({ queue: queueContext });
    } else {
      const exists = queue.find((t) => t.id === track.id);
      if (!exists) {
        set({ queue: [...queue, track] });
      }
    }

    set({ currentTrack: track, isPlaying: false, progress: 0, currentTime: 0, duration: 0, isLoading: true });

    // Remember the previous blob so we can revoke it AFTER the new src is set
    const previousBlobUrl = currentBlobUrl;

    try {
      let src = track.file_url || "";
      let createdBlobUrl: string | null = null;
      if (src && !src.startsWith("http") && !src.startsWith("blob")) {
        src = await getStreamUrl(src);
        createdBlobUrl = src;
      }

      // Aborted by a newer play() call → discard work
      if (myToken !== playToken) {
        if (createdBlobUrl) {
          try { URL.revokeObjectURL(createdBlobUrl); } catch {}
        }
        return;
      }

      if (!src) {
        console.error("[Player] No audio source for track:", track.title);
        set({ isLoading: false });
        return;
      }

      const el = getAudio();
      detachListeners(el);
      try { el.pause(); } catch {}

      el.src = src;
      el.load();
      el.volume = muted ? 0 : volume / 100;
      currentBlobUrl = createdBlobUrl;

      // Now safe to revoke the previous blob — new src is attached
      if (previousBlobUrl && previousBlobUrl !== createdBlobUrl) {
        try { URL.revokeObjectURL(previousBlobUrl); } catch {}
      }

      el.onloadedmetadata = () => {
        if (myToken !== playToken) return;
        set({ duration: el.duration || 0, isLoading: false });
      };
      el.onended = () => {
        if (myToken !== playToken) return;
        get().next();
      };
      el.onerror = (e) => {
        if (myToken !== playToken) return;
        console.error("[Player] Audio error:", e);
        set({ isPlaying: false, isLoading: false });
      };

      await el.play();

      // Aborted while waiting for play() to start
      if (myToken !== playToken) {
        try { el.pause(); } catch {}
        return;
      }

      set({ isPlaying: true, isLoading: false });

      clearProgress();
      progressInterval = setInterval(() => {
        if (myToken !== playToken) return;
        if (el && !el.paused) {
          const prog = el.duration ? (el.currentTime / el.duration) * 100 : 0;
          set({ progress: prog, currentTime: el.currentTime });
        }
      }, 250);
    } catch (err: any) {
      if (myToken !== playToken) return;
      console.error("[Player] Play error:", err);
      set({ isPlaying: false, isLoading: false });
      if (err?.name === "NotAllowedError") {
        toast("Toque em ▶ para continuar a reprodução");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("player:needs-gesture"));
        }
      }
    }
  },

  pause: () => {
    audio?.pause();
    set({ isPlaying: false });
  },

  close: () => {
    destroyAudio();
    set({ currentTrack: null, isPlaying: false, progress: 0, duration: 0, currentTime: 0, isLoading: false });
  },

  resume: () => {
    if (audio) {
      audio.play().catch(console.error);
      set({ isPlaying: true });
    }
  },

  next: () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = queue[(idx + 1) % queue.length];
    get().play(nextTrack);
  },

  previous: () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = queue[(idx - 1 + queue.length) % queue.length];
    get().play(prevTrack);
  },

  setQueue: (tracks) => set({ queue: tracks }),
  addToQueue: (track) => {
    const { queue } = get();
    if (!queue.find((t) => t.id === track.id)) {
      set({ queue: [...queue, track] });
    }
  },

  removeFromQueue: (trackId) => {
    const { queue, currentTrack } = get();
    const newQueue = queue.filter((t) => t.id !== trackId);
    set({ queue: newQueue });

    if (currentTrack?.id === trackId) {
      if (newQueue.length > 0) {
        const idx = queue.findIndex(t => t.id === trackId);
        const nextTrack = newQueue[idx % newQueue.length];
        get().play(nextTrack);
      } else {
        get().close();
      }
    }
  },

  playNext: (track) => {
    const { queue, currentTrack } = get();
    const filteredQueue = queue.filter(t => t.id !== track.id);

    if (!currentTrack) {
      get().play(track);
      return;
    }

    const currentIndex = filteredQueue.findIndex(t => t.id === currentTrack.id);
    const newQueue = [...filteredQueue];
    newQueue.splice(currentIndex + 1, 0, track);

    set({ queue: newQueue });
    toast.success(`"${track.title}" será a próxima a tocar`);
  },

  clearQueue: () => {
    const { currentTrack } = get();
    set({ queue: currentTrack ? [currentTrack] : [] });
  },

  setVolume: (vol) => {
    if (audio) audio.volume = vol / 100;
    set({ volume: vol, muted: false });
  },

  toggleMute: () => {
    const { muted, volume } = get();
    if (audio) audio.volume = muted ? volume / 100 : 0;
    set({ muted: !muted });
  },

  setProgress: (p) => {
    get().seek(p);
  },

  seek: (percent) => {
    if (audio && audio.duration) {
      audio.currentTime = (percent / 100) * audio.duration;
      set({ progress: percent });
    }
  },

  setDuration: (d) => set({ duration: d }),
}));
