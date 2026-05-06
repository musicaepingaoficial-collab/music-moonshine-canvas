import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const DOWNLOAD_BATCH_SIZE = 20;
const DEFAULT_MAX_ZIP_BYTES = 250 * 1024 * 1024; // Reduzido para 250MB para garantir estabilidade máxima
const DEFAULT_ESTIMATED_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IDS_PER_ZIP_PART = 400;
const ARCHIVE_MAX_ATTEMPTS = 3;

type DownloadFile = {
  id: string;
  title: string;
  artist: string;
  url: string | null;
  subfolder: string | null;
};

type DownloadStage = "preparing" | "downloading" | "saving";

export type DownloadMultipleResult = {
  downloaded: number;
  failed: number;
  failedFiles: string[];
};

export type DownloadArchiveItem = {
  id: string;
  fileSize?: number | null;
};

export type DownloadPartsProgress = {
  partIndex: number;
  partCount: number;
  partProgressPercent: number;
  overallProgressPercent: number;
  stage: DownloadStage;
};

export type FailedPart = {
  partIndex: number;
  partName: string;
  ids: string[];
  estimatedBytes: number;
  error: string;
};

export type DownloadManyZipsResult = {
  parts: number;
  downloaded: number;
  failed: number;
  failedFiles: string[];
  failedParts: FailedPart[];
};

type DownloadBlobOptions = {
  revokeDelayMs?: number;
};

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getExtension(contentType: string | null) {
  if (!contentType) return ".mp3";
  if (contentType.includes("mpeg")) return ".mp3";
  if (contentType.includes("mp4")) return ".m4a";
  if (contentType.includes("wav")) return ".wav";
  if (contentType.includes("ogg")) return ".ogg";
  return ".mp3";
}

function buildArchiveFileName(name?: string) {
  const safeName = sanitizeFileName(name || "repertorio") || "repertorio";
  return `${safeName}.zip`;
}

async function downloadBlob(blob: Blob, fileName: string, options: DownloadBlobOptions = {}) {
  if (!blob || blob.size === 0) {
    throw new Error("Arquivo gerado vazio");
  }

  const { revokeDelayMs = 5000 } = options;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);

  try {
    anchor.click();
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), revokeDelayMs);
  }
}

export async function saveBlobAsFile(blob: Blob, fileName: string) {
  await downloadBlob(blob, fileName);
}

function buildTrackFileName(file: DownloadFile, contentType: string | null) {
  const baseName = sanitizeFileName(`${file.artist} - ${file.title}`) || "musica";
  return `${baseName}${getExtension(contentType)}`;
}

async function getJsonHeaders() {
  const token = await getSessionAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

async function getSessionAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Nao autenticado");
  return session.access_token;
}

async function requestDownloadBatch(musicaIds: string[], headers: Record<string, string>): Promise<DownloadFile[]> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/download`, {
    method: "POST",
    headers,
    body: JSON.stringify({ musicaIds }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Falha no download");
  }

  const data = await response.json();
  const files = data.files ?? [];
  if (!files.length) throw new Error("Nenhum arquivo encontrado");
  return files;
}

async function fetchDriveFile(fileId: string, headers: Record<string, string>) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/google-drive`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "stream", fileId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.error || "Falha ao baixar arquivo");
    (error as Error & { statusCode?: number }).statusCode = response.status;
    throw error;
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get("content-type"),
  };
}

function shouldRetry(statusCode?: number) {
  if (!statusCode) return true;
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

async function fetchDriveFileWithRetry(fileId: string, headers: Record<string, string>, maxAttempts = 3) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchDriveFile(fileId, headers);
    } catch (error: any) {
      lastError = error;
      const statusCode = Number(error?.statusCode);
      const isLastAttempt = attempt === maxAttempts;

      if (isLastAttempt || !shouldRetry(statusCode)) {
        break;
      }

      const waitMs = 300 * attempt;
      await new Promise((resolve) => window.setTimeout(resolve, waitMs));
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Falha ao baixar arquivo");
}

async function requestAllDownloadFiles(musicaIds: string[], headers: Record<string, string>) {
  const allFiles: DownloadFile[] = [];

  for (let index = 0; index < musicaIds.length; index += DOWNLOAD_BATCH_SIZE) {
    const batchIds = musicaIds.slice(index, index + DOWNLOAD_BATCH_SIZE);
    const batchFiles = await requestDownloadBatch(batchIds, headers);
    allFiles.push(...batchFiles);
  }

  return allFiles;
}

export async function downloadSingle(musicaId: string): Promise<void> {
  const headers = await getJsonHeaders();
  const files = await requestAllDownloadFiles([musicaId], headers);
  const file = files[0];

  if (!file?.url) throw new Error("URL de download nao encontrada");

  const { blob, contentType } = await fetchDriveFileWithRetry(file.url, headers);
  await downloadBlob(blob, buildTrackFileName(file, contentType), { revokeDelayMs: 3000 });
}

export async function downloadMultiple(
  musicaIds: string[],
  archiveName?: string,
  onProgress?: (downloaded: number, total: number, stage?: DownloadStage) => void
): Promise<DownloadMultipleResult> {
  const fallbackName = buildArchiveFileName(archiveName);
  onProgress?.(0, 100, "preparing");

  const headers = await getJsonHeaders();

  let lastError: unknown = null;
  let response: Response | null = null;

  for (let attempt = 1; attempt <= ARCHIVE_MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(`${SUPABASE_URL}/functions/v1/download-archive`, {
        method: "POST",
        headers,
        body: JSON.stringify({ musicaIds, archiveName }),
      });

      if (response.ok) break;

      const status = response.status;
      const err = await response.json().catch(() => ({}));
      const message = err.error || `Falha ao gerar ZIP (HTTP ${status})`;
      lastError = new Error(message);
      response = null;

      if (!shouldRetry(status) || attempt === ARCHIVE_MAX_ATTEMPTS) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
      if (attempt === ARCHIVE_MAX_ATTEMPTS) throw error;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 600 * attempt));
  }

  if (!response) {
    if (lastError instanceof Error) throw lastError;
    throw new Error("Falha ao gerar ZIP no servidor");
  }

  onProgress?.(1, 100, "downloading");
  let blob: Blob;
  try {
    blob = await response.blob();
  } catch (error) {
    console.error("[zipService:downloadMultiple] Failed to read blob", error);
    throw new Error("Falha ao receber os dados do arquivo do servidor. Tente reduzir o tamanho do download.");
  }

  onProgress?.(99, 100, "saving");
  await downloadBlob(blob, fallbackName, { revokeDelayMs: 60000 });
  onProgress?.(100, 100, "saving");
  return {
    downloaded: musicaIds.length,
    failed: 0,
    failedFiles: [],
  };
}

type ZipPart = {
  ids: string[];
  estimatedBytes: number;
};

function estimateItemSizeBytes(item: DownloadArchiveItem, fallbackBytes: number) {
  const raw = Number(item.fileSize ?? 0);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return fallbackBytes;
}

function computeFallbackBytes(items: DownloadArchiveItem[]) {
  const known = items
    .map((it) => Number(it.fileSize ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (known.length === 0) return DEFAULT_ESTIMATED_FILE_BYTES;
  const avg = known.reduce((s, n) => s + n, 0) / known.length;
  return Math.max(1024 * 1024, Math.round(avg));
}

function splitItemsIntoZipParts(
  items: DownloadArchiveItem[],
  maxZipBytes = DEFAULT_MAX_ZIP_BYTES
): ZipPart[] {
  const parts: ZipPart[] = [];
  let current: ZipPart = { ids: [], estimatedBytes: 0 };
  const fallbackBytes = computeFallbackBytes(items);

  for (const item of items) {
    const size = estimateItemSizeBytes(item, fallbackBytes);
    const wouldOverflowSize = current.estimatedBytes + size > maxZipBytes;
    const wouldOverflowCount = current.ids.length >= MAX_IDS_PER_ZIP_PART;

    if (current.ids.length > 0 && (wouldOverflowSize || wouldOverflowCount)) {
      parts.push(current);
      current = { ids: [], estimatedBytes: 0 };
    }

    current.ids.push(item.id);
    current.estimatedBytes += size;
  }

  if (current.ids.length > 0) {
    parts.push(current);
  }

  return parts;
}

export function planZipParts(
  items: DownloadArchiveItem[],
  maxZipBytes = DEFAULT_MAX_ZIP_BYTES
) {
  const filtered = items.filter((it) => !!it.id);
  const parts = splitItemsIntoZipParts(filtered, maxZipBytes);
  const totalKnownBytes = filtered.reduce(
    (s, it) => s + (Number(it.fileSize) > 0 ? Number(it.fileSize) : 0),
    0
  );
  const unknownCount = filtered.filter(
    (it) => !(Number(it.fileSize) > 0)
  ).length;
  return {
    partCount: parts.length,
    totalKnownBytes,
    unknownCount,
    totalItems: filtered.length,
  };
}

function buildPartArchiveName(baseName: string | undefined, partIndex: number, totalParts: number) {
  const safeBase = sanitizeFileName(baseName || "repertorio") || "repertorio";
  const left = String(partIndex + 1).padStart(2, "0");
  const right = String(totalParts).padStart(2, "0");
  return `${safeBase} - parte ${left} de ${right}`;
}

export async function downloadMultipleAsParts(
  items: DownloadArchiveItem[],
  archiveName?: string,
  options?: {
    maxZipBytes?: number;
    onProgress?: (progress: DownloadPartsProgress & { partEstimatedBytes?: number }) => void;
  }
): Promise<DownloadManyZipsResult> {
  const filteredItems = items.filter((item) => !!item.id);
  if (!filteredItems.length) {
    throw new Error("Nenhum arquivo disponivel para download");
  }

  const parts = splitItemsIntoZipParts(filteredItems, options?.maxZipBytes ?? DEFAULT_MAX_ZIP_BYTES);
  if (!parts.length) {
    throw new Error("Nao foi possivel preparar os arquivos para download");
  }

  let downloaded = 0;
  let failed = 0;
  const failedFiles: string[] = [];
  const failedParts: FailedPart[] = [];

  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const part = parts[partIndex];
    const partName = buildPartArchiveName(archiveName, partIndex, parts.length);

    options?.onProgress?.({
      partIndex,
      partCount: parts.length,
      partProgressPercent: 0,
      overallProgressPercent: Math.round((partIndex / parts.length) * 100),
      stage: "preparing",
      partEstimatedBytes: part.estimatedBytes,
    });

    try {
      const result = await downloadMultiple(part.ids, partName, (progress, total, stage) => {
        const partProgressPercent = total > 0 ? Math.round((progress / total) * 100) : 0;
        const overallProgressPercent = Math.round(((partIndex + partProgressPercent / 100) / parts.length) * 100);
        options?.onProgress?.({
          partIndex,
          partCount: parts.length,
          partProgressPercent,
          overallProgressPercent,
          stage: stage ?? "downloading",
          partEstimatedBytes: part.estimatedBytes,
        });
      });

      downloaded += result.downloaded;
      failed += result.failed;
      if (result.failedFiles.length > 0) {
        failedFiles.push(...result.failedFiles);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao baixar parte";
      console.error(`[downloadMultipleAsParts] part ${partIndex + 1} failed`, error);
      failed += part.ids.length;
      failedParts.push({
        partIndex,
        partName,
        ids: part.ids,
        estimatedBytes: part.estimatedBytes,
        error: message,
      });
    }
  }

  return {
    parts: parts.length,
    downloaded,
    failed,
    failedFiles,
    failedParts,
  };
}
