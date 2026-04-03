import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import type { Anuncio } from "@/types/database";

export function AdBanner({ position = "top" }: { position?: "top" | "inline" }) {
  const [dismissed, setDismissed] = useState(false);

  const { data: anuncios } = useQuery<Anuncio[]>({
    queryKey: ["anuncios", position],
    queryFn: async () => {
      console.log("[AdBanner:fetch]", { position });
      const { data, error } = await supabase
        .from("anuncios")
        .select("*")
        .eq("active", true)
        .limit(1);
      if (error) throw error;
      return (data ?? []) as Anuncio[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const ad = anuncios?.[0];
  if (!ad || dismissed) return null;

  const isTop = position === "top";

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-200 ${
        isTop
          ? "bg-gradient-to-r from-primary/20 via-primary/10 to-accent p-4"
          : "bg-card p-4 border border-border/30"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {ad.image_url && (
            <img
              src={ad.image_url}
              alt={ad.title}
              className="h-12 w-12 rounded-lg object-cover shrink-0"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{ad.title}</p>
            {ad.link && (
              <a
                href={ad.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
                aria-label={`Saiba mais sobre ${ad.title}`}
              >
                Saiba mais →
              </a>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            console.log("[AdBanner:dismissed]", { adId: ad.id });
            setDismissed(true);
          }}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar anúncio"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
