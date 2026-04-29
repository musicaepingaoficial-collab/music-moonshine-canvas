import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Anuncio {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link: string | null;
  active: boolean;
  position: number;
  created_at: string;
}

export function HeroCarousel() {
  const { data: anuncios, isLoading } = useQuery<Anuncio[]>({
    queryKey: ["anuncios", "carousel"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("anuncios" as any) as any)
        .select("*")
        .eq("active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Anuncio[]).filter((a) => !!a.image_url);
    },
    staleTime: 5 * 60 * 1000,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    setSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setSnaps(emblaApi.scrollSnapList());
      onSelect();
    });
  }, [emblaApi, anuncios?.length]);

  if (isLoading) {
    return <div className="h-40 sm:h-56 md:h-64 w-full animate-pulse rounded-2xl bg-muted/50" />;
  }
  if (!anuncios || anuncios.length === 0) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {anuncios.map((ad) => {
            const inner = (
              <div className="relative h-40 sm:h-56 md:h-64 lg:h-72 w-full overflow-hidden">
                <img
                  src={ad.image_url!}
                  alt={ad.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <h3 className="text-lg sm:text-2xl font-bold text-white drop-shadow">
                    {ad.title}
                  </h3>
                  {ad.subtitle && (
                    <p className="mt-1 text-xs sm:text-sm text-white/85 line-clamp-2 max-w-2xl">
                      {ad.subtitle}
                    </p>
                  )}
                </div>
              </div>
            );
            return (
              <div key={ad.id} className="min-w-0 shrink-0 grow-0 basis-full">
                {ad.link ? (
                  <a
                    href={ad.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    aria-label={ad.title}
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>

      {anuncios.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-background/70 backdrop-blur text-foreground shadow hover:bg-background transition"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-background/70 backdrop-blur text-foreground shadow hover:bg-background transition"
            aria-label="Próximo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === selected ? "w-6 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
