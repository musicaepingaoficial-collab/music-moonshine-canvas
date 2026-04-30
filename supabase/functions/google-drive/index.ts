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
  if (!res.ok) throw new Error(`Failed to get access token: ${await res.text()}`);
  return (await res.json()).access_token;
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
      console.error("[google-drive] Erro de autenticação:", authError?.message || "Usuário não encontrado");
      return new Response(JSON.stringify({ 
        error: "Token inválido",
        details: authError?.message
      }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
      return new Response(JSON.stringify({ error: "Google Drive não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
    const body = await req.json();
    const { action } = body;

    if (action === "stream") {
      const { fileId } = body;
      if (!fileId) {
        return new Response(JSON.stringify({ error: "fileId obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accessToken = await getAccessToken(serviceAccount);

      // Fetch the file content from Google Drive
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!driveRes.ok) {
        const err = await driveRes.text();
        console.error("Drive stream error:", err);
        return new Response(JSON.stringify({ error: "Falha ao obter arquivo" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get content type from Drive response
      const contentType = driveRes.headers.get("content-type") || "audio/mpeg";

      // Stream the audio back to client
      return new Response(driveRes.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (action === "stream-url") {
      const { fileId } = body;
      // Return the edge function URL that streams the audio
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      return new Response(JSON.stringify({
        url: `${supabaseUrl}/functions/v1/google-drive`,
        fileId,
        action: "stream",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "select-drive") {
      const { data: drives } = await supabase
        .from("google_drives")
        .select("*")
        .eq("status", "online")
        .order("usage_percent", { ascending: true })
        .limit(1);

      return new Response(JSON.stringify({ drive: drives?.[0] || null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Google Drive error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
