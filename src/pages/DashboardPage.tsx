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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {repertorios.map((rep) => (
          <Link
            key={rep.id}
            to={`/repertorio/${rep.id}`}
            className="group relative aspect-[2/3] w-full overflow-hidden rounded-md bg-card transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-10"
          >
            {rep.cover_url ? (
              <img 
                src={rep.cover_url} 
                alt={rep.name} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                <FolderOpen className="h-12 w-12 opacity-20" />
              </div>
            )}
            
            {/* Overlay degrade estilo Netflix */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
            
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
              <p className="text-sm font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                {rep.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-medium text-green-400 drop-shadow-sm">
                  {rep.musica_count} músicas
                </span>
                <span className="text-[10px] border border-white/30 px-1 rounded text-white/70">
                  HD
                </span>
              </div>
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