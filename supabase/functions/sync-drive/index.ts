import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const encoder = new TextEncoder();
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signingInput));
  const signatureB64 = base64url(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Error getting access token from Google: ${res.status} - ${errorText}`);
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error === "invalid_grant") {
        throw new Error("Erro de autenticação com o Google: A Chave da Conta de Serviço é inválida ou expirou.");
      }
      throw new Error(`Erro do Google: ${errorJson.error_description || errorJson.error || errorText}`);
    } catch {
      throw new Error(`Erro ao obter token do Google: ${res.status}`);
    }
  }
  const data = await res.json();
  return data.access_token;
}

async function listSubfolders(accessToken: string, folderId: string): Promise<Array<{ id: string; name: string }>> {
  const folders: Array<{ id: string; name: string }> = [];
  let pageToken = "";
  do {
    const query = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", query);
    url.searchParams.set("fields", "nextPageToken, files(id, name)");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Google Drive API error listing folders (ID: ${folderId}): ${res.status} - ${errorText}`);
      if (res.status === 404) {
        throw new Error(`Pasta do Google Drive não encontrada (ID: ${folderId}). Verifique se o ID está correto.`);
      }
      if (res.status === 403) {
        throw new Error("Acesso negado à pasta do Google Drive. Verifique se você compartilhou a pasta com o e-mail do bot.");
      }
      throw new Error(`Erro na API do Drive: ${res.status}`);
    }
    const data = await res.json();
    folders.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return folders;
}

async function listAudioInFolder(accessToken: string, folderId: string): Promise<Array<{ id: string; name: string; mimeType: string; size: number }>> {
  const files: Array<{ id: string; name: string; mimeType: string; size: number }> = [];
  let pageToken = "";
  do {
    const query = `'${folderId}' in parents and (mimeType contains 'audio/') and trashed = false`;
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", query);
    url.searchParams.set("fields", "nextPageToken, files(id, name, mimeType, size)");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Google Drive API error listing audio (ID: ${folderId}): ${res.status} - ${errorText}`);
      if (res.status === 404) {
        throw new Error(`Pasta não encontrada (ID: ${folderId}).`);
      }
      if (res.status === 403) {
        throw new Error("Acesso negado ao listar arquivos de áudio.");
      }
      throw new Error(`Erro ao listar áudios: ${res.status}`);
    }
    const data = await res.json();
    files.push(...(data.files || []).map((f: any) => ({ ...f, size: Number(f.size) || 0 })));
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return files;
}

interface AudioWithMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  categoryName: string | null;
  subfolder: string | null;
}

// Recursively collect ALL audio files, tracking the immediate parent folder name
async function listAllAudioRecursive(
  accessToken: string,
  folderId: string,
  parentFolderName: string | null
): Promise<AudioWithMeta[]> {
  const audioFiles = await listAudioInFolder(accessToken, folderId);
  const result: AudioWithMeta[] = audioFiles.map((f) => ({
    ...f,
    categoryName: null, // will be set by caller
    subfolder: parentFolderName,
  }));

  const subfolders = await listSubfolders(accessToken, folderId);
  for (const folder of subfolders) {
    // For nested subfolders, keep the immediate parent name (first-level subfolder)
    const subFiles = await listAllAudioRecursive(
      accessToken,
      folder.id,
      parentFolderName ?? folder.name // if already inside a subfolder, keep the top-level subfolder name
    );
    result.push(...subFiles);
  }
  return result;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[sync-drive] Erro de autenticação:", authError?.message || "Usuário não encontrado");
      return new Response(JSON.stringify({ 
        error: "Token inválido", 
        details: authError?.message 
      }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_KEY não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.error("Erro ao processar GOOGLE_SERVICE_ACCOUNT_KEY:", e);
      return new Response(JSON.stringify({ error: "Configuração da Conta de Serviço inválida (JSON corrompido)" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { driveId, googleDriveTableId } = await req.json();

    if (!driveId || !googleDriveTableId) {
      return new Response(JSON.stringify({ error: "driveId e googleDriveTableId são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken(serviceAccount);

    // === NEW: Get Storage Quota / Drive Info ===
    let totalSizeBytes = 0;
    let usedSizeBytes = 0;
    try {
      // If it's a Shared Drive, we might need a different API, but usually 'about' works for the user/SA
      // However, for Shared Drives, we might need specific Drive info
      const aboutUrl = new URL("https://www.googleapis.com/drive/v3/about");
      aboutUrl.searchParams.set("fields", "storageQuota, driveThemes");
      const aboutRes = await fetch(aboutUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        if (aboutData.storageQuota) {
          totalSizeBytes = Number(aboutData.storageQuota.limit) || 0;
          usedSizeBytes = Number(aboutData.storageQuota.usage) || 0;
        }
      }
    } catch (e) {
      console.warn("Could not fetch drive quota:", e);
    }

    // === STEP 1: Scan Drive ===
    const rootFolders = await listSubfolders(accessToken, driveId);
    const rootAudioFiles = await listAudioInFolder(accessToken, driveId);

    console.log(`Found ${rootFolders.length} root folders and ${rootAudioFiles.length} loose audio files`);

    const allFiles: AudioWithMeta[] = [];

    for (const f of rootAudioFiles) {
      allFiles.push({ ...f, size: f.size || 0, categoryName: null, subfolder: null });
    }

    for (const folder of rootFolders) {
      const directFiles = await listAudioInFolder(accessToken, folder.id);
      for (const f of directFiles) {
        allFiles.push({ ...f, size: f.size || 0, categoryName: folder.name, subfolder: null });
      }

      const subfolders = await listSubfolders(accessToken, folder.id);
      for (const sub of subfolders) {
        const subFiles = await listAllAudioRecursive(accessToken, sub.id, sub.name);
        for (const f of subFiles) {
          allFiles.push({ ...f, categoryName: folder.name, subfolder: f.subfolder });
        }
      }
    }

    console.log(`Total audio files found: ${allFiles.length}`);

    // === STEP 2: Create/find categories ===
    const uniqueCategories = [...new Set(allFiles.map((f) => f.categoryName).filter(Boolean))] as string[];
    const categoryMap: Record<string, string> = {};

    for (const catName of uniqueCategories) {
      const slug = slugify(catName);
      const { data: existing } = await supabase
        .from("categorias")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        categoryMap[catName] = existing.id;
      } else {
        const { data: created, error: catError } = await supabase
          .from("categorias")
          .insert({ name: catName, slug })
          .select("id")
          .single();

        if (catError) {
          console.error(`Error creating category ${catName}:`, catError);
        } else {
          categoryMap[catName] = created.id;
          console.log(`Created category: ${catName} (${created.id})`);
        }
      }
    }

    // === STEP 3: Fetch existing musicas for this drive ===
    const existingMusicas: Array<{ id: string; file_url: string }> = [];
    let offset = 0;
    while (true) {
      const { data: batch, error: fetchErr } = await supabase
        .from("musicas")
        .select("id, file_url")
        .eq("drive_id", googleDriveTableId)
        .range(offset, offset + 999);
      if (fetchErr) throw new Error(`Erro ao buscar músicas existentes: ${fetchErr.message}`);
      if (!batch || batch.length === 0) break;
      existingMusicas.push(...batch.map((m: any) => ({ id: m.id, file_url: m.file_url })));
      if (batch.length < 1000) break;
      offset += 1000;
    }

    // Map file_url (Google Drive file ID) -> existing musica DB id
    const existingMap = new Map<string, string>();
    for (const m of existingMusicas) {
      if (m.file_url) existingMap.set(m.file_url, m.id);
    }

    // Set of all Drive file IDs from the scan
    const driveFileIds = new Set(allFiles.map((f) => f.id));

    // === STEP 4: Incremental sync ===
    let updated = 0;
    let inserted = 0;
    let removed = 0;

    // 4a: Update existing + Insert new using batch upsert
    for (let i = 0; i < allFiles.length; i += 200) {
      const batch = allFiles.slice(i, i + 200);

      const toUpdate: Array<{ id: string; data: any }> = [];
      const toInsert: any[] = [];

      for (const f of batch) {
        const nameWithoutExt = f.name.replace(/\.[^.]+$/, "");
        let title = nameWithoutExt;
        let artist = "Desconhecido";
        if (nameWithoutExt.includes(" - ")) {
          const parts = nameWithoutExt.split(" - ");
          artist = parts[0].trim();
          title = parts.slice(1).join(" - ").trim();
        }

        const categoriaId = f.categoryName ? (categoryMap[f.categoryName] || null) : null;

        const record = {
          title,
          artist,
          file_url: f.id,
          drive_id: googleDriveTableId,
          duration: 0,
          file_size: f.size || 0,
          categoria_id: categoriaId,
          subfolder: f.subfolder || null,
        };

        const existingId = existingMap.get(f.id);
        if (existingId) {
          toUpdate.push({ id: existingId, data: record });
        } else {
          toInsert.push(record);
        }
      }

      // Insert/Update records in a single upsert operation for speed
      const upsertData = batch.map(f => {
        const nameWithoutExt = f.name.replace(/\.[^.]+$/, "");
        let title = nameWithoutExt;
        let artist = "Desconhecido";
        if (nameWithoutExt.includes(" - ")) {
          const parts = nameWithoutExt.split(" - ");
          artist = parts[0].trim();
          title = parts.slice(1).join(" - ").trim();
        }

        const categoriaId = f.categoryName ? (categoryMap[f.categoryName] || null) : null;
        const existingId = existingMap.get(f.id);

        return {
          ...(existingId ? { id: existingId } : {}),
          title,
          artist,
          file_url: f.id,
          drive_id: googleDriveTableId,
          duration: 0,
          file_size: f.size || 0,
          categoria_id: categoriaId,
          subfolder: f.subfolder || null,
        };
      });

      if (upsertData.length > 0) {
        const { error: upsertErr } = await supabase
          .from("musicas")
          .upsert(upsertData, { onConflict: 'file_url' });
          
        if (upsertErr) {
          console.error("Upsert error:", upsertErr);
          // If upsert fails, fallback to manual logic or throw
          throw new Error(`Erro ao salvar músicas: ${upsertErr.message}`);
        }
        
        // Count updates vs inserts for logging (approximate)
        batch.forEach(f => {
          if (existingMap.has(f.id)) updated++;
          else inserted++;
        });
      }
    }

    // 4b: Delete musicas that no longer exist in Drive
    const toDelete = existingMusicas
      .filter((m) => m.file_url && !driveFileIds.has(m.file_url))
      .map((m) => m.id);

    if (toDelete.length > 0) {
      for (let i = 0; i < toDelete.length; i += 50) {
        const batch = toDelete.slice(i, i + 50);
        const { error: delErr } = await supabase
          .from("musicas")
          .delete()
          .in("id", batch);
        if (delErr) console.error("Delete error:", delErr);
        else removed += batch.length;
      }
    }

    console.log(`Sync complete: ${updated} updated, ${inserted} inserted, ${removed} removed`);

    // Update Drive stats in DB
    const usagePercent = totalSizeBytes > 0 ? Math.round((usedSizeBytes / totalSizeBytes) * 100) : 0;
    await supabase
      .from("google_drives")
      .update({ 
        usage_percent: usagePercent,
        total_size_bytes: totalSizeBytes,
        used_size_bytes: usedSizeBytes,
        status: "online"
      })
      .eq("id", googleDriveTableId);
    // await cleanOrphanCategories(supabase);

    return new Response(JSON.stringify({
      message: `Sincronização concluída: ${updated} atualizadas, ${inserted} novas, ${removed} removidas.`,
      updated,
      inserted,
      removed,
      total: allFiles.length,
      categories: uniqueCategories,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function cleanOrphanCategories(supabase: ReturnType<typeof createClient>) {
  const { data: allCats } = await supabase.from("categorias").select("id");
  if (!allCats || allCats.length === 0) return;

  for (const cat of allCats) {
    const { count } = await supabase
      .from("musicas")
      .select("id", { count: "exact", head: true })
      .eq("categoria_id", cat.id);

    if (count === 0) {
      await supabase.from("categorias").delete().eq("id", cat.id);
      console.log(`Deleted orphan category: ${cat.id}`);
    }
  }
}
