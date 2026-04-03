import { create } from "zustand";
import type { Musica } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";

let audio: HTMLAudioElement | null = null;
let progressInterval: ReturnType<typeof setInterval> | null = null;

function cleanupAudio() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  if (audio) {
    audio.pause();
    audio.src = "";
    audio = null;
  }
}

async function getStreamUrl(fileId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Use POST to stream action
  const res = await fetch(`${supabaseUrl}/functions/v1/google-drive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey,
    },
    body: JSON.stringify({ action: "stream", fileId }),
  });

  if (!res.ok) throw new Error("Falha ao obter áudio");

  const blob = await res.blob();
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

  play: (track: Musica) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  close: () => void;
  setQueue: (tracks: Musica[]) => void;
  addToQueue: (track: Musica) => void;
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

  play: async (track) => {
    const { queue, volume, muted } = get();
    const exists = queue.find((t) => t.id === track.id);
    if (!exists) {
      set({ queue: [...queue, track] });
    }
    set({ currentTrack: track, isPlaying: false, progress: 0, isLoading: true });

    cleanupAudio();

    try {
      // If file_url is a Google Drive file ID (not a full URL)
      let src = track.file_url || "";
      if (src && !src.startsWith("http") && !src.startsWith("blob")) {
        src = await getStreamUrl(src);
      }

      if (!src) {
        console.error("[Player] No audio source for track:", track.title);
        set({ isLoading: false });
        return;
      }

      audio = new Audio(src);
      audio.volume = muted ? 0 : volume / 100;

      audio.addEventListener("loadedmetadata", () => {
        set({ duration: audio?.duration || 0, isLoading: false });
      });

      audio.addEventListener("ended", () => {
        get().next();
      });

      audio.addEventListener("error", (e) => {
        console.error("[Player] Audio error:", e);
        set({ isPlaying: false, isLoading: false });
      });

      await audio.play();
      set({ isPlaying: true, isLoading: false });

      progressInterval = setInterval(() => {
        if (audio && !audio.paused) {
          const prog = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
          set({ progress: prog, currentTime: audio.currentTime });
        }
      }, 250);
    } catch (err) {
      console.error("[Player] Play error:", err);
      set({ isPlaying: false, isLoading: false });
    }
  },

  pause: () => {
    audio?.pause();
    set({ isPlaying: false });
  },

  close: () => {
    cleanupAudio();
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
    // When user drags the slider, also seek
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
