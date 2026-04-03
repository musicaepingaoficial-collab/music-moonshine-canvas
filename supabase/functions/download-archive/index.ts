import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";
import { Zip, ZipPassThrough } from "https://esm.sh/fflate@0.8.2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition, X-Archive-File-Name",
};

const downloadCounts = new Map<string, { count: number; resetAt: number }>();
const DOWNLOAD_LIMIT_PER_HOUR = 20;
const MAX_FILES_PER_ARCHIVE = 500;
const MAX_TOTAL_SIZE_BYTES = 2 * 1024 * 1024 * 1024;
const MUSICA_QUERY_BATCH_SIZE = 80;

type MusicaRow = {
  id: string;
  title: string;
  artist: string;
  file_url: string | null;
  subfolder: string | null;
  file_size: number | null;
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

function buildTrackFileName(file: MusicaRow, contentType: string | null) {
  const baseName = sanitizeFileName(`${file.artist} - ${file.title}`) || "musica";
  return `${baseName}${getExtension(contentType)}`;
}

function getUniqueFileName(fileName: string, usedNames: Set<string>) {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const extensionIndex = fileName.lastIndexOf(".");
  const hasExtension = extensionIndex > 0;
  const baseName = hasExtension ? fileName.slice(0, extensionIndex) : fileName;
  const extension = hasExtension ? fileName.slice(extensionIndex) : "";

  let counter = 2;
  let candidate = `${baseName} (${counter})${extension}`;
  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = `${baseName} (${counter})${extension}`;
  }

  usedNames.add(candidate);
  return candidate;
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = downloadCounts.get(userId);

  if (!entry || now > entry.resetAt) {
    downloadCounts.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }

  if (entry.count >= DOWNLOAD_LIMIT_PER_HOUR) {
    return false;
  }

  entry.count++;
  return true;
}

async function isAdminUser(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (error) {
    console.error("[DownloadArchive:roleCheckError]", error);
    return false;
  }

  return Boolean(data);
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function createGoogleJWT(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const headerB64 = base64url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payloadB64 = base64url(encoder.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    throw new Error(`Failed to get access token: ${await res.text()}`);
  }

  return (await res.json()).access_token;
}

async function parseRequestPayload(req: Request): Promise<{ payload: any; tokenFromBody: string | null }> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const payloadB64 = url.searchParams.get("payload_b64");
    let payload: any = {};

    if (payloadB64) {
      try {
        payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payloadB64), (c) => c.charCodeAt(0))));
      } catch {
        payload = {};
      }
    }

    if (!Array.isArray(payload.musicaIds)) {
      const musicaIdsRaw = url.searchParams.get("musica_ids");
      payload.musicaIds = musicaIdsRaw
        ? musicaIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
        : [];
    }

    if (!payload.archiveName) {
      payload.archiveName = url.searchParams.get("archive_name") || undefined;
    }

    return { payload, tokenFromBody: null };
  }

  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    const payload = await req.json().catch(() => ({}));
    const tokenFromBody = typeof payload.access_token === "string"
      ? payload.access_token
      : typeof payload.accessToken === "string"
      ? payload.accessToken
      : null;
    return { payload, tokenFromBody };
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const payloadRaw = form.get("payload");
    const payloadB64Raw = form.get("payload_b64");
    let payload: any = {};
    const musicaIdsFromForm = form
      .getAll("musicaIds")
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    const archiveNameFromForm = form.get("archiveName");

    if (typeof payloadB64Raw === "string" && payloadB64Raw.trim()) {
      try {
        payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payloadB64Raw), (c) => c.charCodeAt(0))));
      } catch {
        payload = {};
      }
    } else if (typeof payloadRaw === "string" && payloadRaw.trim()) {
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        payload = {};
      }
    }

    const currentMusicaIds = Array.isArray(payload.musicaIds) ? payload.musicaIds : [];
    if (musicaIdsFromForm.length > 0) {
      payload.musicaIds = musicaIdsFromForm;
    } else if (!Array.isArray(currentMusicaIds) || currentMusicaIds.length === 0) {
      const musicaIdsRaw = form.get("musicaIds");
      payload.musicaIds = typeof musicaIdsRaw === "string"
        ? musicaIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
        : [];
    }

    if (!payload.archiveName && typeof archiveNameFromForm === "string") {
      payload.archiveName = archiveNameFromForm;
    }

    const tokenRaw = form.get("access_token");
    const altTokenRaw = form.get("accessToken");
    return {
      payload,
      tokenFromBody: typeof tokenRaw === "string"
        ? tokenRaw
        : typeof altTokenRaw === "string"
        ? altTokenRaw
        : null,
    };
  }

  return { payload: {}, tokenFromBody: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { payload: body, tokenFromBody } = await parseRequestPayload(req);
    const authHeader = req.headers.get("Authorization");
    const urlToken = new URL(req.url).searchParams.get("access_token");
    const tokenFromHeader = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
    const token = tokenFromHeader || tokenFromBody || urlToken;

    if (!token) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token invalido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = await isAdminUser(supabase, user.id);
    if (!isAdmin && !checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Limite de downloads por hora atingido" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const musicaIds = Array.isArray(body.musicaIds) ? body.musicaIds.filter((id: unknown) => typeof id === "string") : [];
    const archiveNameInput = typeof body.archiveName === "string" ? body.archiveName : "repertorio";

    if (!musicaIds.length) {
      return new Response(JSON.stringify({ error: "IDs de musicas sao obrigatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin && musicaIds.length > MAX_FILES_PER_ARCHIVE) {
      return new Response(JSON.stringify({ error: `Maximo de ${MAX_FILES_PER_ARCHIVE} musicas por arquivo` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userPlan: string | null = null;
    if (!isAdmin) {
      const { data: subscription } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!subscription) {
        return new Response(JSON.stringify({ error: "Assinatura ativa necessaria para download" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
        await supabase
          .from("assinaturas")
          .update({ status: "expired" })
          .eq("id", subscription.id);

        return new Response(JSON.stringify({ error: "Sua assinatura expirou" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userPlan = subscription.plan;
      if (userPlan === "trial" && musicaIds.length > 1) {
        return new Response(JSON.stringify({ error: "No plano trial, apenas 1 musica por vez" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const musicas: MusicaRow[] = [];
    for (let index = 0; index < musicaIds.length; index += MUSICA_QUERY_BATCH_SIZE) {
      const batchIds = musicaIds.slice(index, index + MUSICA_QUERY_BATCH_SIZE);
      const { data: batchRows, error: batchError } = await supabase
        .from("musicas")
        .select("id, title, artist, file_url, subfolder, file_size")
        .in("id", batchIds);

      if (batchError) {
        console.error("[DownloadArchive:fetchMusicasError]", {
          message: batchError.message,
          details: batchError.details,
          hint: batchError.hint,
          code: batchError.code,
          batchSize: batchIds.length,
        });
        return new Response(JSON.stringify({ error: "Falha ao consultar musicas do repertorio" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (batchRows?.length) {
        musicas.push(...(batchRows as MusicaRow[]));
      }
    }

    if (!musicas.length) {
      return new Response(JSON.stringify({ error: "Musicas nao encontradas" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const musicaById = new Map<string, MusicaRow>((musicas as MusicaRow[]).map((m) => [m.id, m]));
    const orderedMusicas = musicaIds.map((id: string) => musicaById.get(id)).filter((m): m is MusicaRow => Boolean(m));
    const validMusicas = orderedMusicas.filter((m) => !!m.file_url);

    if (!validMusicas.length) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo disponivel para gerar o ZIP" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const estimatedBytes = validMusicas.reduce((sum, m) => sum + (m.file_size || 0), 0);
    if (!isAdmin && estimatedBytes > MAX_TOTAL_SIZE_BYTES) {
      return new Response(JSON.stringify({ error: "Arquivo muito grande. Reduza o repertorio e tente novamente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccountRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountRaw) {
      return new Response(JSON.stringify({ error: "Google Drive nao configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    const accessToken = await getAccessToken(serviceAccount);

    const archiveRoot = sanitizeFileName(archiveNameInput) || "repertorio";
    const archiveFileName = `${archiveRoot}.zip`;
    const usedNames = new Set<string>();
    const encoder = new TextEncoder();

    const zipStream = new ReadableStream<Uint8Array>({
      start(controller) {
        const zip = new Zip((error, chunk, final) => {
          if (error) {
            controller.error(error);
            return;
          }

          controller.enqueue(chunk);
          if (final) {
            controller.close();
          }
        });

        (async () => {
          const successIds: string[] = [];
          const failedFiles: string[] = [];

          for (const musica of validMusicas) {
            const driveResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files/${musica.file_url}?alt=media`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!driveResponse.ok || !driveResponse.body) {
              failedFiles.push(`${musica.artist} - ${musica.title}`);
              continue;
            }

            const contentType = driveResponse.headers.get("content-type");
            const fileName = getUniqueFileName(buildTrackFileName(musica, contentType), usedNames);
            const safeSubfolder = musica.subfolder ? sanitizeFileName(musica.subfolder) : "";
            const zipPath = safeSubfolder
              ? `${archiveRoot}/${safeSubfolder}/${fileName}`
              : `${archiveRoot}/${fileName}`;

            const zipEntry = new ZipPassThrough(zipPath);
            zip.add(zipEntry);

            const reader = driveResponse.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                zipEntry.push(value, false);
              }
            }
            zipEntry.push(new Uint8Array(0), true);
            successIds.push(musica.id);
          }

          if (failedFiles.length > 0) {
            const failedEntry = new ZipPassThrough(`${archiveRoot}/_falhas.txt`);
            zip.add(failedEntry);
            failedEntry.push(
              encoder.encode(
                ["Arquivos que falharam durante a geracao do ZIP:", ...failedFiles].join("\n")
              ),
              true
            );
          }

          if (successIds.length > 0) {
            const downloadRecords = successIds.map((musicaId) => ({
              user_id: user.id,
              musica_id: musicaId,
            }));

            const { error: insertError } = await supabase.from("downloads").insert(downloadRecords);
            if (insertError) {
              console.error("[DownloadArchive:insertDownloadsError]", insertError);
            }
          } else {
            const infoEntry = new ZipPassThrough(`${archiveRoot}/_erro.txt`);
            zip.add(infoEntry);
            infoEntry.push(
              encoder.encode("Nao foi possivel incluir nenhum arquivo no ZIP."),
              true
            );
          }

          zip.end();
        })().catch((error) => {
          console.error("[DownloadArchive:streamError]", error);
          controller.error(error);
        });
      },
    });

    return new Response(zipStream, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(archiveFileName)}`,
        "X-Archive-File-Name": archiveFileName,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[DownloadArchive:error]", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
