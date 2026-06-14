import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import type { Anuncio } from "@/types/database";
import { useAuth, useAssinatura } from "@/hooks/useUser";

export function AdBanner({ position = "top" }: { position?: "top" | "inline" }) {
  const [dismissed, setDismissed] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { data: assinatura, isLoading: subLoading, isFetching: subFetching } = useAssinatura(user?.id);

  const currentPlan = useMemo(() => {
    const a: any = assinatura;
    if (!a || a.status !== "active") return null;
    if (a.expires_at && new Date(a.expires_at) < new Date()) return null;
    return (a.plan as string) ?? null;
  }, [assinatura]);

  const { data: anuncios } = useQuery<Anuncio[]>({
    queryKey: ["anuncios", position, "list"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("anuncios" as any) as any)
        .select("*")
        .eq("active", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Anuncio[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const ad = useMemo(() => {
    if (!anuncios) return undefined;
    return anuncios.find((a) => {
      const incl = (a as any).include_plan_slugs ?? [];
      const excl = (a as any).exclude_plan_slugs ?? [];
      if (currentPlan && excl.includes(currentPlan)) return false;
      if (incl.length > 0) {
        if (!currentPlan || !incl.includes(currentPlan)) return false;
      }
      return true;
    });
  }, [anuncios, currentPlan]);

  // Wait for auth/subscription before deciding, so we never flash an ad
  // that should be hidden for the user's current plan.
  if (authLoading || (user && (subLoading || subFetching))) return null;
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
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar anúncio"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
