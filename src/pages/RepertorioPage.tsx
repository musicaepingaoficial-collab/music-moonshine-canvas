import { useParams, Link, useNavigate } from "react-router-dom";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MusicCard } from "@/components/music/MusicCard";
import { usePlayerStore } from "@/stores/playerStore";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MusicGridSkeleton } from "@/components/ui/Skeletons";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, ChevronDown, ChevronRight, Download, FolderOpen, HardDrive, Music2, Loader2, Eraser, ListPlus } from "lucide-react";
import { downloadMultiple, hasFileSystemAccess, pickZipDestination, type DownloadArchiveItem } from "@/services/zipService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRemoveMusicaFromRepertorio, useRemoveMusicasFromRepertorio, useUpdateRepertorioCover, useClearRepertorio } from "@/hooks/useRepertorios";
import { toast } from "sonner";
import { useMemo, useRef, useState, useEffect } from "react";
import type { Musica } from "@/types/database";
import { useAssinatura, useAuth, useHasActiveSubscription } from "@/hooks/useUser";
import { usePagination } from "@/hooks/usePagination";

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
    // Sort by depth (number of slashes) first, then alphabetically
    const depthA = (a[0].match(/\//g) || []).length;
    const depthB = (b[0].match(/\//g) || []).length;
    if (depthA !== depthB) return depthA - depthB;
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
  const [downloadDone, setDownloadDone] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [downloadBytes, setDownloadBytes] = useState(0);
  const [downloadStage, setDownloadStage] = useState<"preparing" | "downloading" | "saving">("preparing");
  const [downloadCurrentFile, setDownloadCurrentFile] = useState<string>("");
  const [pendingDownload, setPendingDownload] = useState<{
    items: DownloadArchiveItem[];
    name: string;
    label: string;
  } | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { data: assinatura } = useAssinatura(user?.id);
  const { hasAccess, isAdmin } = useHasActiveSubscription();
  const navigate = useNavigate();
  const isTrial = assinatura?.plan === "trial";

  const removeSingle = useRemoveMusicaFromRepertorio();
  const removeMultiple = useRemoveMusicasFromRepertorio();
  const updateCover = useUpdateRepertorioCover();
  const clearRepertorio = useClearRepertorio();
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
      const allMusicas: Musica[] = [];
      let offset = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("repertorio_musicas")
          .select("musica_id, musicas(*)")
          .eq("repertorio_id", id!)
          .range(offset, offset + limit - 1);
          
        if (error) throw error;
        if (!data || data.length === 0) break;

        allMusicas.push(...(data as any[]).map((rm) => rm.musicas as Musica));
        if (data.length < limit) break;
        offset += limit;
      }

      return allMusicas;
    },
    enabled: !!id,
  });

  const totalSize = useMemo(() => {
    if (!musicas) return 0;
    return musicas.reduce((sum, m) => sum + (m.file_size || 0), 0);
  }, [musicas]);

  const groups = useMemo(() => groupBySubfolder(musicas ?? []), [musicas]);
  const hasFolders = groups.some((g) => g.name !== null);

  // Group folders by their parent folder for hierarchical navigation
  const folderTree = useMemo(() => {
    const rootFolders: string[] = [];
    const children: Record<string, string[]> = {};

    groups.forEach(g => {
      if (g.name) {
        const parts = g.name.split('/');
        if (parts.length === 1) {
          if (!rootFolders.includes(g.name)) rootFolders.push(g.name);
        } else {
          // Add all intermediate parents to the tree
          for (let i = 0; i < parts.length - 1; i++) {
            const parent = parts.slice(0, i + 1).join('/');
            const child = parts.slice(0, i + 2).join('/');
            
            if (i === 0 && !rootFolders.includes(parts[0])) {
              rootFolders.push(parts[0]);
            }
            
            if (!children[parent]) children[parent] = [];
            if (!children[parent].includes(child)) children[parent].push(child);
          }
        }
      }
    });

    // Sort folders alphabetically
    rootFolders.sort();
    Object.keys(children).forEach(key => children[key].sort());

    return { rootFolders, children };
  }, [groups]);

  const [navigationPath, setNavigationPath] = useState<string[]>([]);
  
  const currentLevelFolders = useMemo(() => {
    if (navigationPath.length === 0) return folderTree.rootFolders;
    const currentPath = navigationPath.join('/');
    return folderTree.children[currentPath] || [];
  }, [folderTree, navigationPath]);

  const handleFolderClick = (folderName: string) => {
    const parts = folderName.split('/');
    setNavigationPath(parts);
    // Only select the folder if it has music in this specific path
    const hasMusic = groups.some(g => g.name === folderName);
    if (hasMusic) {
      setSelectedFolder(folderName);
    } else {
      setSelectedFolder(null);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setNavigationPath([]);
      setSelectedFolder(null);
    } else {
      const newPath = navigationPath.slice(0, index + 1);
      setNavigationPath(newPath);
      setSelectedFolder(newPath.join('/'));
    }
  };

  const toggleFolder = (folder: string) => {
    setSelectedFolder(folder === selectedFolder ? null : folder);
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const displayMusicas = useMemo(() => {
    if (!selectedFolder) {
      return groups.find(g => g.name === null)?.musicas ?? [];
    }
    return groups.find(g => g.name === selectedFolder)?.musicas ?? [];
  }, [groups, selectedFolder]);

  const { paginatedItems, PaginationComponent } = usePagination(displayMusicas, 24);

  // If selected folder is removed or empty, reset
  useEffect(() => {
    if (selectedFolder && !groups.some(g => g.name === selectedFolder)) {
      setSelectedFolder(null);
    }
  }, [groups, selectedFolder]);

  // Avisa o usuário se ele tentar fechar a aba durante um download
  useEffect(() => {
    if (!downloading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [downloading]);

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

  const handleClearRepertorio = () => {
    if (!id || !confirm("Tem certeza que deseja remover TODAS as músicas deste repertório?")) return;
    clearRepertorio.mutate(id, {
      onSuccess: () => toast.success("Repertório limpo com sucesso"),
      onError: () => toast.error("Erro ao limpar repertório"),
    });
  };

  const runDownload = async (
    items: DownloadArchiveItem[],
    name: string,
    contextLabel: string
  ) => {
    // IMPORTANTE: abrir o seletor "Salvar como…" ANTES de qualquer await,
    // senão o navegador rejeita por falta de user activation.
    let fileHandle: any = null;
    if (hasFileSystemAccess()) {
      try {
        const picked = await pickZipDestination(name);
        if (picked === "cancelled") return;
        fileHandle = picked;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao abrir seletor.");
        return;
      }
    }

    setDownloading(true);
    setDownloadDone(0);
    setDownloadTotal(items.length);
    setDownloadBytes(0);
    setDownloadStage("preparing");
    setDownloadCurrentFile("");
    try {
      const result = await downloadMultiple(
        items.map((it) => it.id),
        name,
        (progress) => {
          setDownloadDone(progress.downloaded);
          setDownloadTotal(progress.total);
          setDownloadBytes(progress.bytesDownloaded);
          setDownloadStage(progress.stage);
          if (progress.currentFile) setDownloadCurrentFile(progress.currentFile);
        },
        fileHandle
      );

      if (result.failed > 0) {
        toast.warning(
          `ZIP gerado com ${result.downloaded} arquivo(s). ${result.failed} falharam.`
        );
      } else {
        toast.success(`Download concluido! ${result.downloaded} musicas em um unico ZIP.`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : `Erro ao baixar ${contextLabel}.`;
      if (msg !== "Download cancelado") toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = () => {
    if (!musicas?.length) return;
    if (!hasAccess) {
      toast.error("Assine um plano para baixar repertórios.");
      navigate("/planos");
      return;
    }
    setPendingDownload({
      items: musicas.map((m) => ({ id: m.id, fileSize: m.file_size })),
      name: repertorio?.name ?? "repertorio",
      label: "o repertório completo",
    });
  };

  const handleDownloadFolder = (folder: string, tracks: Musica[]) => {
    if (!tracks.length) return;
    if (!hasAccess) {
      toast.error("Assine um plano para baixar pastas.");
      navigate("/planos");
      return;
    }
    setPendingDownload({
      items: tracks.map((m) => ({ id: m.id, fileSize: m.file_size })),
      name: `${repertorio?.name ?? "repertorio"}_${folder}`,
      label: `a pasta "${folder.split("/").pop()}"`,
    });
  };

  const downloadPlan = useMemo(() => {
    if (!pendingDownload) return null;
    const totalKnownBytes = pendingDownload.items.reduce(
      (s, it) => s + (Number(it.fileSize) > 0 ? Number(it.fileSize) : 0),
      0
    );
    const unknownCount = pendingDownload.items.filter((it) => !(Number(it.fileSize) > 0)).length;
    return {
      totalItems: pendingDownload.items.length,
      totalKnownBytes,
      unknownCount,
    };
  }, [pendingDownload]);

  const isLoading = loadingRep || loadingMusicas;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
        <MusicGridSkeleton count={12} />
      </div>
    );
  }

  const renderMusicGrid = (tracks: Musica[]) => (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
      className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6"
    >
      {tracks.map((t) => (
        <motion.div
          key={t.id}
          className="min-w-0"
          variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
        >
          <MusicCard
            id={t.id}
            title={t.title}
            artist={t.artist}
            coverUrl={t.cover_url}
            fileUrl={t.file_url}
            driveId={t.drive_id}
            queueContext={displayMusicas}
          />
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {errorRep ? (
        <ErrorState message="Erro ao carregar repertÃ³rio." onRetry={() => refetch()} />
      ) : (
        <>
          {/* Header with cover */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            <div className="group relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-xl bg-secondary border-2 border-dashed border-border overflow-hidden transition-colors cursor-default"
              aria-label="Capa do repertÃ³rio"
            >
              {repertorio?.cover_url ? (
                <img src={repertorio.cover_url} alt="Capa" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground transition-colors">
                  <Music2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1 pt-1 w-full">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {repertorio?.name ?? "Carregando..."}
              </h1>
              <p className="text-sm text-muted-foreground">
                {repertorio?.description ?? `${musicas?.length ?? 0} Musicas Neste Repertório`}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground pt-1">
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

          <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden">
            <Link to="/repertorios">
              <Button variant="ghost" size="sm" aria-label="Voltar para repertÃ³rios">
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
            </Link>
            <div className="flex min-w-0 items-center justify-end gap-2 overflow-hidden">
              {(musicas?.length ?? 0) > 0 && (
                <div className="flex min-w-0 items-center justify-end gap-2 overflow-hidden">
                  <Button
                    size="sm"
                    variant="outline"
                    className="max-w-[88px] truncate border-destructive/20 px-2 text-destructive hover:bg-destructive/10 sm:max-w-none sm:px-3"
                    onClick={() => {
                      if (confirm("Deseja realmente limpar toda a lista de reprodução atual?")) {
                        usePlayerStore.getState().clearQueue();
                        toast.success("Lista de reprodução limpa");
                      }
                    }}
                  >
                    Limpar lista
                  </Button>
                  <Button
                    onClick={handleDownloadAll}
                    disabled={downloading || isTrial}
                    size="sm"
                    title={isTrial ? "Disponível apenas para assinantes" : undefined}
                    aria-label="Baixar repertório completo"
                  >
                    <Download className="mr-1 h-4 w-4" />
                    {isTrial ? "Assine para baixar" : downloading ? "Baixando..." : "Baixar tudo"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {downloading && (
            <div className="space-y-2 rounded-lg border border-border bg-card p-3 sm:p-4">
              <div className="flex items-center justify-between text-[10px] sm:text-sm text-muted-foreground gap-2">
                <span className="truncate">
                  {downloadStage === "preparing"
                    ? "Preparando download..."
                    : downloadStage === "downloading"
                    ? `Baixando ${downloadDone}/${downloadTotal}${downloadCurrentFile ? ` • ${downloadCurrentFile}` : ""}`
                    : "Finalizando ZIP..."}
                  {downloadBytes > 0 ? ` • ${formatFileSize(downloadBytes)}` : ""}
                </span>
                <span className="shrink-0">
                  {downloadTotal > 0 ? Math.round((downloadDone / downloadTotal) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={downloadTotal > 0 ? (downloadDone / downloadTotal) * 100 : 0}
                className="h-1.5 sm:h-2"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground/80">
                ⚠️ Mantenha esta aba aberta e o computador ligado até o download concluir. Se o PC hibernar, o download será interrompido.
              </p>
            </div>
          )}

          <AlertDialog
            open={!!pendingDownload}
            onOpenChange={(open) => !open && setPendingDownload(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar download</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    {pendingDownload && downloadPlan && (
                      <>
                        <p>
                          Você vai baixar <strong>{downloadPlan.totalItems}</strong>{" "}
                          música(s) de {pendingDownload.label}.
                        </p>
                        <p>
                          Tamanho estimado:{" "}
                          <strong>
                            {downloadPlan.totalKnownBytes > 0
                              ? formatFileSize(downloadPlan.totalKnownBytes)
                              : "—"}
                          </strong>
                          {downloadPlan.unknownCount > 0 &&
                            ` (+ ${downloadPlan.unknownCount} arquivo(s) sem tamanho informado)`}
                        </p>
                        <p className="text-muted-foreground">
                          Tudo será empacotado em <strong>um único ZIP</strong>, gerado direto no seu navegador.
                          O download começa após você confirmar o local de salvamento.
                        </p>
                      </>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!pendingDownload) return;
                    const { items, name, label } = pendingDownload;
                    setPendingDownload(null);
                    runDownload(items, name, label);
                  }}
                >
                  Baixar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isLoading ? (
            <MusicGridSkeleton count={6} />
          ) : (musicas?.length ?? 0) > 0 ? (
              <div className="min-w-0 max-w-full space-y-6 overflow-hidden">
              <div className="mb-6 min-w-0 max-w-full space-y-4 overflow-hidden">
                {/* Breadcrumbs */}
                <div className="flex min-w-0 max-w-full items-center gap-1 overflow-hidden pb-2 text-xs text-muted-foreground">
                  <button 
                    onClick={() => handleBreadcrumbClick(-1)}
                    className={`flex shrink-0 items-center gap-1 whitespace-nowrap transition-colors hover:text-primary ${navigationPath.length === 0 ? 'text-primary font-bold' : ''}`}
                  >
                    <FolderOpen className="h-3 w-3" />
                    Raiz
                  </button>
                  {navigationPath.map((part, i) => (
                    <div key={i} className="flex min-w-0 items-center gap-1 overflow-hidden">
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <button 
                        onClick={() => handleBreadcrumbClick(i)}
                        className={`min-w-0 truncate transition-colors hover:text-primary ${i === navigationPath.length - 1 ? 'text-primary font-bold' : ''}`}
                      >
                        {part}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Subfolders Grid */}
                {currentLevelFolders.length > 0 && (
                  <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {currentLevelFolders.map((folder) => {
                      const folderName = folder.split('/').pop() || folder;
                      const isSelected = selectedFolder === folder;
                      const hasFiles = groups.some(g => g.name === folder);
                      
                      return (
                        <div key={folder} className="group relative min-w-0 overflow-hidden">
                          <Button
                            variant="outline"
                            className={`w-full justify-start gap-2 h-auto py-3 px-3 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all ${
                              isSelected ? "border-primary bg-primary/10" : ""
                            }`}
                            onClick={() => handleFolderClick(folder)}
                          >
                            <FolderOpen className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                            <div className="flex flex-col items-start min-w-0">
                              <span className="text-sm font-medium truncate w-full text-left">
                                {folderName}
                              </span>
                              {hasFiles && (
                                <span className="text-[10px] text-muted-foreground">
                                  {groups.find(g => g.name === folder)?.musicas.length} músicas
                                </span>
                              )}
                            </div>
                          </Button>
                          {/* Botão de excluir pasta removido conforme solicitação */}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <h3 className="text-sm font-semibold flex items-center gap-2 min-w-0 flex-1">
                    {selectedFolder ? (
                      <>
                        <Music2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">Músicas em {selectedFolder.split('/').pop()}</span>
                      </>
                    ) : navigationPath.length === 0 ? (
                      <>
                        <Music2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">Músicas na Raiz</span>
                      </>
                    ) : (
                      <>
                        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">Selecione uma subpasta acima</span>
                      </>
                    )}
                  </h3>
                  {selectedFolder && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFolder(selectedFolder, displayMusicas)}
                        disabled={downloading || isTrial}
                        className="h-8"
                      >
                        {downloading ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3.5 w-3.5" />
                        )}
                        Baixar pasta
                      </Button>
                    </div>
                  )}
                </div>
                
                {paginatedItems.length > 0 ? (
                  <>
                    {renderMusicGrid(paginatedItems)}
                    <PaginationComponent />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center italic">
                    Nenhuma música nesta seção.
                  </p>
                )}
              </div>
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

