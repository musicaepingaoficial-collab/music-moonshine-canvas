import { supabase } from "@/integrations/supabase/client";
import { downloadZip } from "client-zip";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const DOWNLOAD_BATCH_SIZE = 20; // Limite da edge function `download`
const CONCURRENT_DOWNLOADS = 4; // Quantos arquivos baixar em paralelo do Drive
const FETCH_RETRY_ATTEMPTS = 3;
const STREAM_IDLE_TIMEOUT_MS = 60_000; // Sem receber bytes por 60s = considerado travado
const FILE_RETRY_ATTEMPTS = 4; // Tentativas de baixar o arquivo inteiro antes de desistir

// Wake Lock para impedir que tela/sistema durma durante o download
let wakeLockSentinel: any = null;
let wakeLockVisibilityHandler: (() => void) | null = null;

async function requestWakeLock() {
  try {
    if (typeof navigator === "undefined" || !(navigator as any).wakeLock) return;
    wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
    // O lock é liberado automaticamente quando a aba perde foco; re-solicitar ao voltar
    wakeLockVisibilityHandler = async () => {
      if (document.visibilityState === "visible" && !wakeLockSentinel) {
        try {
          wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        } catch { /* ignore */ }
      }
    };
    document.addEventListener("visibilitychange", wakeLockVisibilityHandler);
    if (wakeLockSentinel?.addEventListener) {
      wakeLockSentinel.addEventListener("release", () => {
        wakeLockSentinel = null;
      });
    }
  } catch {
    // Sem permissão ou não suportado — segue sem wake lock
  }
}

async function releaseWakeLock() {
  try {
    if (wakeLockVisibilityHandler) {
      document.removeEventListener("visibilitychange", wakeLockVisibilityHandler);
      wakeLockVisibilityHandler = null;
    }
    if (wakeLockSentinel?.release) await wakeLockSentinel.release();
  } catch { /* ignore */ }
  wakeLockSentinel = null;
}

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

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeFolderPath(value: string) {
  return value
    .split("/")
    .map((segment) => sanitizeFileName(segment))
    .filter(Boolean)
    .join("/");
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

function buildTrackFileName(file: DownloadFile, contentType: string | null) {
  const baseName = sanitizeFileName(`${file.artist} - ${file.title}`) || "musica";
  return `${baseName}${getExtension(contentType)}`;
}

function buildZipPath(file: DownloadFile, contentType: string | null, usedNames: Set<string>) {
  const fileName = buildTrackFileName(file, contentType);
  const folder = file.subfolder ? sanitizeFolderPath(file.subfolder) : "";
  let candidate = folder ? `${folder}/${fileName}` : fileName;

  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }

  const dotIdx = candidate.lastIndexOf(".");
  const base = dotIdx > 0 ? candidate.slice(0, dotIdx) : candidate;
  const ext = dotIdx > 0 ? candidate.slice(dotIdx) : "";
  let i = 2;
  while (usedNames.has(`${base} (${i})${ext}`)) i++;
  candidate = `${base} (${i})${ext}`;
  usedNames.add(candidate);
  return candidate;
}

async function getSessionAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Nao autenticado");
  return session.access_token;
}

async function getJsonHeaders() {
  const token = await getSessionAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

async function requestDownloadBatch(musicaIds: string[], headers: Record<string, string>): Promise<DownloadFile[]> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/download`, {
    method: "POST",
    headers,
    body: JSON.stringify({ musicaIds }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Falha ao preparar download");
  }

  const data = await response.json();
  const files = data.files ?? [];
  return files;
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

async function fetchDriveStream(fileId: string, headers: Record<string, string>): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= FETCH_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-drive`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "stream", fileId }),
      });
      if (response.ok && response.body) return response;
      const status = response.status;
      const errText = await response.text().catch(() => "");
      lastError = new Error(`HTTP ${status} ${errText}`);
      if (status < 500 && status !== 408 && status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("Falha ao baixar arquivo do Drive");
}

async function fetchDriveBlob(fileId: string, headers: Record<string, string>) {
  const response = await fetchDriveStream(fileId, headers);
  return {
    blob: await response.blob(),
    contentType: response.headers.get("content-type"),
  };
}

async function downloadBlob(blob: Blob, fileName: string, revokeDelayMs = 5000) {
  if (!blob || blob.size === 0) throw new Error("Arquivo gerado vazio");
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  try {
    anchor.click();
    await new Promise((r) => window.setTimeout(r, 150));
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), revokeDelayMs);
  }
}

export async function saveBlobAsFile(blob: Blob, fileName: string) {
  await downloadBlob(blob, fileName);
}

export async function downloadSingle(musicaId: string): Promise<void> {
  const headers = await getJsonHeaders();
  const files = await requestAllDownloadFiles([musicaId], headers);
  const file = files[0];
  if (!file?.url) throw new Error("URL de download nao encontrada");

  const { blob, contentType } = await fetchDriveBlob(file.url, headers);
  await downloadBlob(blob, buildTrackFileName(file, contentType), 3000);
}

// Detecta se o navegador suporta File System Access API (Chrome/Edge/Opera)
export function hasFileSystemAccess(): boolean {
  return typeof (window as any).showSaveFilePicker === "function";
}

/**
 * Abre o seletor "Salvar como…" do navegador. DEVE ser chamado SINCRONAMENTE
 * dentro do handler de clique do usuário — qualquer await antes invalida a
 * "user activation" e o navegador rejeita com SecurityError.
 *
 * Retorna:
 *   - FileSystemFileHandle: usuário escolheu local
 *   - null: navegador não suporta (vai pro fallback de blob)
 *   - "cancelled": usuário cancelou o diálogo
 */
export async function pickZipDestination(
  suggestedName: string
): Promise<any | null | "cancelled"> {
  if (!hasFileSystemAccess()) return null;
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: buildArchiveFileName(suggestedName),
      types: [{ description: "Arquivo ZIP", accept: { "application/zip": [".zip"] } }],
    });
    return handle;
  } catch (err: any) {
    if (err?.name === "AbortError") return "cancelled";
    console.error("[zipService] showSaveFilePicker falhou", err);
    throw new Error(
      "Não foi possível abrir o seletor de arquivo. Clique em Baixar novamente."
    );
  }
}

/** Aguarda o navegador voltar a ficar online, com timeout. */
function waitForOnline(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || navigator.onLine) {
      resolve();
      return;
    }
    const onOnline = () => {
      window.removeEventListener("online", onOnline);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      window.removeEventListener("online", onOnline);
      reject(new Error("OFFLINE_TIMEOUT"));
    }, timeoutMs);
    window.addEventListener("online", onOnline);
  });
}

type ProgressCallback = (info: {
  downloaded: number;
  total: number;
  bytesDownloaded: number;
  totalBytes: number;
  stage: DownloadStage;
  currentFile?: string;
}) => void;

/**
 * Baixa múltiplas músicas como um único ZIP gerado no navegador.
 * Suporta repertórios de qualquer tamanho usando streaming.
 */
export async function downloadMultiple(
  musicaIds: string[],
  archiveName?: string,
  onProgress?: ProgressCallback
): Promise<DownloadMultipleResult> {
  if (!musicaIds.length) throw new Error("Nenhuma musica selecionada");

  const finalFileName = buildArchiveFileName(archiveName);
  const headers = await getJsonHeaders();

  // Solicita Wake Lock para impedir que tela/sistema durma durante o download
  await requestWakeLock();

  onProgress?.({
    downloaded: 0,
    total: musicaIds.length,
    bytesDownloaded: 0,
    totalBytes: 0,
    stage: "preparing",
  });

  // 1. Pega URLs de todas as músicas (em batches por causa do limite da edge function)
  const files = await requestAllDownloadFiles(musicaIds, headers);
  const validFiles = files.filter((f) => !!f.url);
  if (!validFiles.length) throw new Error("Nenhum arquivo disponivel para download");

  const total = validFiles.length;
  let downloaded = 0;
  let bytesDownloaded = 0;
  const failedFiles: string[] = [];
  const usedNames = new Set<string>();

  // Tenta usar File System Access API para escrever ZIP direto no disco (sem usar memória)
  let writableStream: WritableStream<Uint8Array> | null = null;
  let fileHandle: any = null;

  if (hasFileSystemAccess()) {
    try {
      fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: finalFileName,
        types: [{ description: "Arquivo ZIP", accept: { "application/zip": [".zip"] } }],
      });
      writableStream = await fileHandle.createWritable();
    } catch (err: any) {
      // Usuário cancelou o seletor de arquivo
      if (err?.name === "AbortError") {
        await releaseWakeLock();
        throw new Error("Download cancelado");
      }
      // Outro erro -> cai pro fallback
      writableStream = null;
    }
  }

  // 2. Cria um async iterable que baixa as músicas com concorrência controlada
  const filesQueue = [...validFiles];
  const inflight = new Map<string, Promise<{ name: string; input: Response } | null>>();

  /**
   * Lê o body de um Response com timeout entre chunks.
   * Se ficar mais de STREAM_IDLE_TIMEOUT_MS sem receber bytes, lança erro
   * (provavelmente o computador hibernou ou a conexão caiu).
   */
  async function readBodyWithIdleTimeout(
    response: Response,
    onChunk: (bytes: number) => void
  ): Promise<Uint8Array> {
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        let timeoutId: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error("STREAM_IDLE_TIMEOUT")),
            STREAM_IDLE_TIMEOUT_MS
          );
        });
        let result: ReadableStreamReadResult<Uint8Array>;
        try {
          result = await Promise.race([reader.read(), timeoutPromise]);
        } finally {
          clearTimeout(timeoutId);
        }
        if (result.done) break;
        if (result.value) {
          chunks.push(result.value);
          totalBytes += result.value.byteLength;
          onChunk(result.value.byteLength);
        }
      }
    } catch (err) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw err;
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    return merged;
  }

  async function fetchOne(file: DownloadFile): Promise<{ name: string; input: Response } | null> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= FILE_RETRY_ATTEMPTS; attempt++) {
      // Marcador de bytes para esta tentativa, para revertermos o progresso em caso de falha
      let attemptBytes = 0;
      try {
        // Se o navegador estiver offline, espera voltar (com limite)
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          await waitForOnline(STREAM_IDLE_TIMEOUT_MS);
        }

        const response = await fetchDriveStream(file.url!, headers);
        const contentType = response.headers.get("content-type");
        // Só registra o nome na primeira tentativa bem-sucedida
        const name = (file as any).__zipName || buildZipPath(file, contentType, usedNames);
        (file as any).__zipName = name;

        const buffer = await readBodyWithIdleTimeout(response, (chunkBytes) => {
          attemptBytes += chunkBytes;
          bytesDownloaded += chunkBytes;
          onProgress?.({
            downloaded,
            total,
            bytesDownloaded,
            totalBytes: 0,
            stage: "downloading",
            currentFile: name,
          });
        });

        const wrappedHeaders = new Headers();
        if (contentType) wrappedHeaders.set("content-type", contentType);
        wrappedHeaders.set("content-length", String(buffer.byteLength));
        const wrapped = new Response(buffer as BodyInit, { headers: wrappedHeaders });
        return { name, input: wrapped };
      } catch (error) {
        lastError = error;
        // Reverte os bytes contabilizados nesta tentativa
        bytesDownloaded -= attemptBytes;
        const isLast = attempt === FILE_RETRY_ATTEMPTS;
        console.warn(
          `[zipService] Tentativa ${attempt}/${FILE_RETRY_ATTEMPTS} falhou para ${file.artist} - ${file.title}`,
          error
        );
        if (!isLast) {
          // Espera proporcional + extra se offline
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            await waitForOnline(STREAM_IDLE_TIMEOUT_MS);
          } else {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
          }
        }
      }
    }
    console.error(`[zipService] Desistindo de ${file.artist} - ${file.title}`, lastError);
    failedFiles.push(`${file.artist} - ${file.title}`);
    return null;
  }


  // Generator que entrega arquivos prontos para o client-zip, mantendo CONCURRENT_DOWNLOADS em voo
  async function* fileGenerator(): AsyncGenerator<{ name: string; input: Response }> {
    const promises: Array<Promise<{ name: string; input: Response } | null>> = [];

    function fillPool() {
      while (promises.length < CONCURRENT_DOWNLOADS && filesQueue.length > 0) {
        const next = filesQueue.shift()!;
        promises.push(fetchOne(next));
      }
    }

    fillPool();

    while (promises.length > 0) {
      // Pega o próximo na ordem (mantém ordem original)
      const result = await promises.shift()!;
      if (result) {
        yield result;
        downloaded++;
        onProgress?.({
          downloaded,
          total,
          bytesDownloaded,
          totalBytes: 0,
          stage: "downloading",
          currentFile: result.name,
        });
      }
      fillPool();
    }
  }

  onProgress?.({
    downloaded: 0,
    total,
    bytesDownloaded: 0,
    totalBytes: 0,
    stage: "downloading",
  });

  // 3. Gera o ZIP com client-zip (sem compressão = level 0, igual ao anterior)
  const zipResponse = downloadZip(fileGenerator() as any, {
    metadata: undefined as any,
  });

  try {
    if (writableStream) {
      // Caminho premium: streaming direto pro disco
      try {
        await zipResponse.body!.pipeTo(writableStream);
        onProgress?.({
          downloaded,
          total,
          bytesDownloaded,
          totalBytes: 0,
          stage: "saving",
        });
      } catch (err) {
        try { await writableStream.abort(); } catch { /* ignore */ }
        throw err;
      }
    } else {
      // Fallback: tudo em memória (Firefox/Safari) — limite prático ~2GB
      onProgress?.({
        downloaded,
        total,
        bytesDownloaded,
        totalBytes: 0,
        stage: "saving",
      });
      const blob = await zipResponse.blob();
      if (!blob || blob.size === 0) throw new Error("ZIP gerado vazio");
      await downloadBlob(blob, finalFileName, 60000);
    }
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("STREAM_IDLE_TIMEOUT") || msg.includes("OFFLINE_TIMEOUT")) {
      throw new Error(
        "Download interrompido — provavelmente o computador entrou em hibernação ou a conexão caiu. Mantenha o computador ligado e tente novamente."
      );
    }
    throw err;
  } finally {
    await releaseWakeLock();
  }

  return {
    downloaded,
    failed: failedFiles.length,
    failedFiles,
  };
}
