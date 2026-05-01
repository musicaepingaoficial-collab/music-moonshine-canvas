import { Banner } from "@/components/ui/Banner";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { AdBanner } from "@/components/ads/AdBanner";
import { FolderOpen } from "lucide-react";
import { PdfsHighlight } from "@/components/pdfs/PdfsHighlight";
import { ReferralBanner } from "@/components/referrals/ReferralBanner";
import { HeroCarousel } from "@/components/promotions/HeroCarousel";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRepertorios } from "@/hooks/useRepertorios";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const AllRepertorios = () => {
  const { data: repertorios, isLoading } = useRepertorios();

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Todos os repertórios</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!repertorios || repertorios.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Todos os repertórios</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {repertorios.map((rep) => (
          <Link
            key={rep.id}
            to={`/repertorio/${rep.id}`}
            className="group relative h-44 w-full overflow-hidden rounded-xl border bg-card transition-all hover:scale-105 hover:shadow-lg"
          >
            {rep.cover_url ? (
              <img src={rep.cover_url} alt={rep.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                <FolderOpen className="h-10 w-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-xs font-bold text-white line-clamp-2 leading-tight">{rep.name}</p>
              <p className="text-[10px] text-white/70">{rep.musica_count} músicas</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const DashboardPage = () => {
  const { isLoading: isLoadingReps } = useRepertorios();

  useEffect(() => {
    async function flushPendingReferral() {
      try {
        const ref = localStorage.getItem("referral_code");
        if (!ref) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliates`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ action: "register-referral", referralCode: ref }),
          }
        );
        localStorage.removeItem("referral_code");
      } catch {
        /* ignore */
      }
    }
    flushPendingReferral();
  }, []);

  return (
    <div className="space-y-6">
      <AdBanner position="top" />

      <Banner
        title="Bem-vindo de volta 👋"
        subtitle="Descubra novas músicas e curta suas favoritas."
      />

      <HeroCarousel />

      <ReferralBanner />

      <AllRepertorios />

      {isLoadingReps && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Carregando conteúdos...</h2>
          <MusicGridSkeleton count={6} />
        </section>
      )}

      <PdfsHighlight />
    </div>
  );
};

export default DashboardPage;