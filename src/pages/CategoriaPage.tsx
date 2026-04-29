import { useState } from "react";
import { useParams } from "react-router-dom";
import { Banner } from "@/components/ui/Banner";
import { MusicCard } from "@/components/music/MusicCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useMusicasByCategoria } from "@/hooks/useMusics";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Music, Folder, ArrowLeft, Download, ListPlus } from "lucide-react";
import { downloadMultipleAsParts } from "@/services/zipService";
import { AddBulkToRepertorioDialog } from "@/components/music/AddBulkToRepertorioDialog";
import { toast } from "sonner";
import { useAssinatura, useAuth, useHasActiveSubscription } from "@/hooks/useUser";
import { useNavigate } from "react-router-dom";

const CategoriaPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: tracks, isLoading, error, refetch } = useMusicasByCategoria(id);
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { user } = useAuth();
  const { data: assinatura } = useAssinatura(user?.id);
  const { hasAccess } = useHasActiveSubscription();
  const navigate = useNavigate();
  const isTrial = assinatura?.plan === "trial";

  // Get unique subfolders
  const subfolders = tracks
    ? [...new Set(tracks.filter((t) => t.subfolder).map((t) => t.subfolder as string))].sort()
    : [];

  // Loose tracks (no subfolder)
  const looseTracks = tracks?.filter((t) => !t.subfolder) ?? [];

  // Filtered tracks when a subfolder is selected
  const filteredTracks = selectedSubfolder
    ? tracks?.filter((t) => t.subfolder === selectedSubfolder) ?? []
    : [];

  const showSubfolderView = !selectedSubfolder && subfolders.length > 0;

  const handleBatchDownload = async (musicas: { id: string; file_size?: number | null }[], label: string) => {
    if (!musicas.length) return;
    if (!hasAccess) {
      toast.error("Assine um plano para baixar pastas e categorias.");
      navigate("/planos");
      return;
    }
    setDownloading(true);
    try {
      const result = await downloadMultipleAsParts(
        musicas.map((m) => ({ id: m.id, fileSize: m.file_size })),
        label,
        { maxZipBytes: 300 * 1024 * 1024 }
      );
      if (result.failed > 0) {
        toast.warning(
          `${result.parts} ZIP(s) de "${label}" gerados. ${result.downloaded} arquivo(s) incluidos e ${result.failed} falharam. Extraia cada ZIP separadamente.`
        );
      } else {
        toast.success(`${result.parts} ZIP(s) de "${label}" baixados com sucesso! Extraia cada ZIP separadamente.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao preparar download.");
    } finally {
      setDownloading(false);
    }
  };

  const categoryName = id ? id.charAt(0).toUpperCase() + id.slice(1) : "Categoria";

  return (
    <div className="space-y-8">
      <Banner
        title={selectedSubfolder ? selectedSubfolder : categoryName}
        subtitle={
          selectedSubfolder
            ? `${filteredTracks.length} músicas`
            : `${tracks?.length ?? 0} músicas disponíveis`
        }
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          {selectedSubfolder && (
            <button
              onClick={() => setSelectedSubfolder(null)}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para {categoryName}
            </button>
          )}
        </div>

        {!isLoading && !error && (
          <div className="flex items-center gap-2">
            <AddBulkToRepertorioDialog
              musicaIds={
                selectedSubfolder
                  ? filteredTracks.map((t) => t.id)
                  : (tracks ?? []).map((t) => t.id)
              }
              label={selectedSubfolder ?? categoryName}
            >
              <Button size="sm" variant="outline">
                <ListPlus className="mr-1.5 h-4 w-4" />
                Salvar em repertório
              </Button>
            </AddBulkToRepertorioDialog>
              <Button
                size="sm"
                variant="outline"
                disabled={downloading || isTrial}
                title={isTrial ? "Disponível apenas para assinantes" : undefined}
                onClick={() => {
                  const selectedTracks = selectedSubfolder ? filteredTracks : tracks ?? [];
                  const label = selectedSubfolder ?? categoryName;
                  handleBatchDownload(selectedTracks, label);
                }}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {isTrial ? "Assine para baixar pasta" : downloading ? "Preparando..." : selectedSubfolder ? "Baixar pasta" : "Baixar categoria"}
              </Button>
          </div>
        )}
      </div>

      {error && <ErrorState message="Erro ao carregar categoria." onRetry={() => refetch()} />}

      {isLoading && <MusicGridSkeleton count={6} />}

      {!isLoading && !error && (tracks?.length ?? 0) === 0 && (
        <EmptyState icon={Music} title="Nenhuma música nesta categoria." />
      )}

      {/* Subfolder navigation view */}
      {!isLoading && !error && showSubfolderView && (
        <>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          >
            {subfolders.map((folder) => {
              const count = tracks?.filter((t) => t.subfolder === folder).length ?? 0;
              return (
                <motion.button
                  key={folder}
                  variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                  onClick={() => setSelectedSubfolder(folder)}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-4 text-center transition-all hover:border-primary/30 hover:bg-accent hover:shadow-md"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <Folder className="h-8 w-8" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="truncate text-sm font-medium text-foreground">{folder}</p>
                    <p className="text-xs text-muted-foreground">{count} músicas</p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Loose tracks below folders */}
          {looseTracks.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Músicas avulsas</h3>
              <motion.div
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.04 } } }}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
              >
                {looseTracks.map((t) => (
                  <motion.div
                    key={t.id}
                    variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                  >
                    <MusicCard id={t.id} title={t.title} artist={t.artist} coverUrl={t.cover_url} fileUrl={t.file_url} driveId={t.drive_id} />
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </>
      )}

      {/* Selected subfolder or no subfolders — show tracks directly */}
      {!isLoading && !error && (selectedSubfolder ? filteredTracks.length > 0 : !showSubfolderView && (tracks?.length ?? 0) > 0) && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        >
          {(selectedSubfolder ? filteredTracks : tracks!).map((t) => (
            <motion.div
              key={t.id}
              variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
            >
              <MusicCard id={t.id} title={t.title} artist={t.artist} coverUrl={t.cover_url} fileUrl={t.file_url} driveId={t.drive_id} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default CategoriaPage;
