import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { motion } from "framer-motion";
import { useMusicas } from "@/hooks/useMusics";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AdBanner } from "@/components/ads/AdBanner";
import { Music } from "lucide-react";
import { PdfsHighlight } from "@/components/pdfs/PdfsHighlight";
import { ReferralBanner } from "@/components/referrals/ReferralBanner";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const DashboardPage = () => {
  const { data: musicas, isLoading, error, refetch } = useMusicas();

  const recent = musicas?.slice(0, 6) ?? [];
  const popular = musicas?.slice(6, 10) ?? [];

  console.log("[Dashboard:render]", { count: musicas?.length, isLoading, hasError: !!error });

  return (
    <div className="space-y-6">
      <AdBanner position="top" />

      <Banner
        title="Bem-vindo de volta 👋"
        subtitle="Descubra novas músicas e curta suas favoritas."
      />

      <ReferralBanner />

      {isLoading && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Tocados recentemente</h2>
          <MusicGridSkeleton count={6} />
        </section>
      )}

      {error && <ErrorState message="Faça login para ver suas músicas." onRetry={() => refetch()} />}

      {!isLoading && !error && musicas?.length === 0 && (
        <EmptyState icon={Music} title="Nenhuma música disponível ainda." description="Novas músicas serão adicionadas em breve." />
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Tocados recentemente</h2>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {recent.map((track) => (
              <motion.div key={track.id} variants={item}>
                <MusicCard id={track.id} title={track.title} artist={track.artist} coverUrl={track.cover_url} fileUrl={track.file_url} driveId={track.drive_id} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {recent.length > 0 && popular.length > 0 && <AdBanner position="inline" />}

      {popular.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Populares agora</h2>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {popular.map((track) => (
              <motion.div key={track.id} variants={item}>
                <MusicCard id={track.id} title={track.title} artist={track.artist} coverUrl={track.cover_url} fileUrl={track.file_url} driveId={track.drive_id} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      <PdfsHighlight />
    </div>
  );
};

export default DashboardPage;
