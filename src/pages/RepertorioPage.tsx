import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MusicCard } from "@/components/music/MusicCard";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, ChevronDown, ChevronRight, Download, FolderOpen, HardDrive, Music2, Trash2 } from "lucide-react";
import { downloadMultipleAsParts } from "@/services/zipService";
import { useRemoveMusicaFromRepertorio, useRemoveMusicasFromRepertorio, useUpdateRepertorioCover } from "@/hooks/useRepertorios";
import { toast } from "sonner";
import { useMemo, useRef, useState } from "react";
import type { Musica } from "@/types/database";
import { useAssinatura, useAuth } from "@/hooks/useUser";

interface FolderGroup {
  name: string | null;
  musicas: Musica[];
}

function groupBySubfolder(musicas: Musica[]): FolderGroup[] {
  const map = new Map<string | null, Musica[]>();
  for (const m of musicas) {
    const key = m.subfolder || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }

  const groups: FolderGroup[] = [];
  const sorted = [...map.entries()].sort((a, b) => {
    if (a[0] === null) return 1;
    if (b[0] === null) return -1;
    return a[0].localeCompare(b[0]);
  });
  for (const [name, musicas] of sorted) {
    groups.push({ name, musicas });
  }
  return groups;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

const RepertorioPage = () => {
  const { id } = useParams<{ id: string }>();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [downloadStage, setDownloadStage] = useState<"preparing" | "downloading" | "saving">("preparing");
  const [downloadPart, setDownloadPart] = useState(0);
  const [downloadPartsTotal, setDownloadPartsTotal] = useState(0);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { data: assinatura } = useAssinatura(user?.id);
  const isTrial = assinatura?.plan === "trial";

  const removeSingle = useRemoveMusicaFromRepertorio();
  const removeMultiple = useRemoveMusicasFromRepertorio();
  const updateCover = useUpdateRepertorioCover();
  const queryClient = useQueryClient();

  const { data: repertorio, isLoading: loadingRep, error: errorRep, refetch } = useQuery({
    queryKey: ["repertorio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repertorios")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: musicas, isLoading: loadingMusicas } = useQuery<Musica[]>({
    queryKey: ["repertorio-musicas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repertorio_musicas")
        .select("musica_id, musicas(*)")
        .eq("repertorio_id", id!);
      if (error) throw error;
      return (data ?? []).map((rm: any) => rm.musicas as Musica);
    },
    enabled: !!id,
  });

  const totalSize = useMemo(() => {
    if (!musicas) return 0;
    return musicas.reduce((sum, m) => sum + (m.file_size || 0), 0);
  }, [musicas]);

  const groups = useMemo(() => groupBySubfolder(musicas ?? []), [musicas]);
  const hasFolders = groups.some((g) => g.name !== null);

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem vÃ¡lida.");
      return;
    }
    updateCover.mutate(
      { repertorioId: id, coverFile: file },
      {
        onSuccess: () => {
          toast.success("Capa atualizada!");
          queryClient.invalidateQueries({ queryKey: ["repertorio", id] });
        },
        onError: () => toast.error("Erro ao atualizar capa."),
      }
    );
  };

  const handleRemoveSingle = (musicaId: string, title: string) => {
    if (!id) return;
    removeSingle.mutate(
      { repertorioId: id, musicaId },
      {
        onSuccess: () => toast.success(`"${title}" removida do repertÃ³rio`),
        onError: () => toast.error("Erro ao remover mÃºsica"),
      }
    );
  };

  const handleRemoveFolder = (folder: string, musicaIds: string[]) => {
    if (!id) return;
    removeMultiple.mutate(
      { repertorioId: id, musicaIds },
      {
        onSuccess: () => toast.success(`Pasta "${folder}" removida do repertÃ³rio`),
        onError: () => toast.error("Erro ao remover pasta"),
      }
    );
  };

  const handleDownloadAll = async () => {
    if (!musicas?.length) return;
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadTotal(100);
    setDownloadStage("preparing");
    setDownloadPart(0);
    setDownloadPartsTotal(0);
    try {
      const result = await downloadMultipleAsParts(
        musicas.map((m) => ({ id: m.id, fileSize: m.file_size })),
        repertorio?.name ?? "repertorio",
        {
          maxZipBytes: 300 * 1024 * 1024,
          onProgress: (progress) => {
            setDownloadProgress(progress.overallProgressPercent);
            setDownloadPartsTotal(progress.partCount);
            setDownloadPart(progress.partIndex + 1);
            setDownloadStage(progress.stage);
          },
        }
      );

      if (result.failed > 0) {
        toast.warning(
          `${result.parts} ZIP(s) gerados. ${result.downloaded} arquivo(s) incluidos e ${result.failed} falharam. Extraia cada ZIP separadamente.`
        );
      } else {
        toast.success(`${result.parts} ZIP(s) baixados com sucesso! Extraia cada ZIP separadamente.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao baixar repertorio.");
    } finally {
      setDownloading(false);
    }
  };

  const isLoading = loadingRep || loadingMusicas;

  const renderMusicGrid = (tracks: Musica[]) => (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
    >
      {tracks.map((t) => (
        <motion.div
          key={t.id}
          variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
        >
          <MusicCard
            id={t.id}
            title={t.title}
            artist={t.artist}
            coverUrl={t.cover_url}
            fileUrl={t.file_url}
            driveId={t.drive_id}
            onRemove={() => handleRemoveSingle(t.id, t.title)}
            removeDisabled={removeSingle.isPending}
          />
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {errorRep ? (
        <ErrorState message="Erro ao carregar repertÃ³rio." onRetry={() => refetch()} />
      ) : (
        <>
          {/* Header with cover */}
          <div className="flex items-start gap-5">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={updateCover.isPending}
              className="group relative flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-secondary border-2 border-dashed border-border overflow-hidden transition-colors hover:border-primary"
              aria-label="Alterar capa do repertÃ³rio"
            >
              {repertorio?.cover_url ? (
                <>
                  <img src={repertorio.cover_url} alt="Capa" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                  <Camera className="h-6 w-6" />
                  <span className="text-[10px]">Adicionar capa</span>
                </div>
              )}
            </button>
            <div className="flex-1 min-w-0 space-y-1 pt-1">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {repertorio?.name ?? "Carregando..."}
              </h1>
              <p className="text-sm text-muted-foreground">
                {repertorio?.description ?? `${musicas?.length ?? 0} Musicas Neste Repertório`}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Music2 className="h-3.5 w-3.5" />
                  {musicas?.length ?? 0} Musicas
                </span>
                {totalSize > 0 && (
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" />
                    {formatFileSize(totalSize)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link to="/repertorios">
              <Button variant="ghost" size="sm" aria-label="Voltar para repertÃ³rios">
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
            </Link>
            {(musicas?.length ?? 0) > 0 && (
              <Button
                onClick={handleDownloadAll}
                disabled={downloading || isTrial}
                size="sm"
                title={isTrial ? "DisponÃ­vel apenas para assinantes" : undefined}
                aria-label="Baixar repertÃ³rio completo"
              >
                <Download className="mr-1 h-4 w-4" />
                {isTrial ? "Assine para baixar" : downloading ? "Baixando..." : "Baixar tudo"}
              </Button>
            )}
          </div>

          {downloading && downloadTotal > 0 && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {downloadStage === "preparing"
                    ? `Preparando ZIP${downloadPartsTotal > 0 ? ` ${downloadPart}/${downloadPartsTotal}` : ""}...`
                    : downloadStage === "downloading"
                    ? `Baixando ZIP${downloadPartsTotal > 0 ? ` ${downloadPart}/${downloadPartsTotal}` : ""}...`
                    : `Finalizando ZIP${downloadPartsTotal > 0 ? ` ${downloadPart}/${downloadPartsTotal}` : ""}...`}
                </span>
                <span>{Math.round((downloadProgress / downloadTotal) * 100)}%</span>
              </div>
              <Progress value={(downloadProgress / downloadTotal) * 100} className="h-2" />
            </div>
          )}

          {isLoading ? (
            <MusicGridSkeleton count={6} />
          ) : (musicas?.length ?? 0) > 0 ? (
            <div className="space-y-6">
              {groups.map((group) => {
                if (group.name === null) {
                  return (
                    <div key="__loose__" className="space-y-3">
                      {hasFolders && (
                        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Music2 className="h-4 w-4" /> MÃºsicas avulsas
                        </h3>
                      )}
                      {renderMusicGrid(group.musicas)}
                    </div>
                  );
                }

                const isCollapsed = collapsedFolders.has(group.name);
                return (
                  <div key={group.name} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleFolder(group.name!)}
                        className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <FolderOpen className="h-4 w-4 text-primary" />
                        {group.name}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({group.musicas.length})
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFolder(group.name!, group.musicas.map((m) => m.id))}
                        disabled={removeMultiple.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Remover pasta
                      </Button>
                    </div>
                    {!isCollapsed && renderMusicGrid(group.musicas)}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Music2} title="Nenhuma mÃºsica neste repertÃ³rio ainda." />
          )}
        </>
      )}
    </div>
  );
};

export default RepertorioPage;

