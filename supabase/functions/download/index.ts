import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const downloadCounts = new Map<string, { count: number; resetAt: number }>();
const DOWNLOAD_LIMIT_PER_HOUR = 20;
const MAX_FILES_PER_REQUEST = 20;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = downloadCounts.get(userId);

  if (!entry || now > entry.resetAt) {
    downloadCounts.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }

  if (entry.count >= DOWNLOAD_LIMIT_PER_HOUR) {
    console.log("[Download:rateLimited]", { userId, count: entry.count });
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
    console.error("[Download:roleCheckError]", error);
    return false;
  }

  return Boolean(data);
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = await isAdminUser(supabase, user.id);

    if (!isAdmin && !checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Limite de downloads por hora atingido. Tente novamente mais tarde." }), {
        status: 429,
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
        return new Response(JSON.stringify({ error: "Assinatura ativa necessária para download" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
        console.log("[Download:subscriptionExpired]", { userId: user.id, expiresAt: subscription.expires_at });
        await supabase
          .from("assinaturas")
          .update({ status: "expired" })
          .eq("id", subscription.id);

        return new Response(JSON.stringify({ error: "Sua assinatura expirou. Renove para continuar baixando." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userPlan = subscription.plan;
    }

    const { musicaIds } = await req.json();

    if (!musicaIds || !Array.isArray(musicaIds) || musicaIds.length === 0) {
      return new Response(JSON.stringify({ error: "IDs de músicas necessários" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (musicaIds.length > MAX_FILES_PER_REQUEST && !isAdmin) {
      return new Response(JSON.stringify({ error: "Máximo 20 músicas por download" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trial users can only download 1 music at a time
    if (!isAdmin && userPlan === "trial" && musicaIds.length > 1) {
      return new Response(JSON.stringify({ error: "No teste grátis, você pode baixar apenas 1 música por vez." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[Download:processing]", { userId: user.id, count: musicaIds.length, isAdmin });

    const { data: musicas, error: fetchError } = await supabase
      .from("musicas")
      .select("id, title, artist, file_url, subfolder")
      .in("id", musicaIds);

    if (fetchError || !musicas || musicas.length === 0) {
      return new Response(JSON.stringify({ error: "Músicas não encontradas" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const downloadRecords = musicas.map((musica: any) => ({
      user_id: user.id,
      musica_id: musica.id,
    }));
    await supabase.from("downloads").insert(downloadRecords);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const urls = musicas.map((m: any) => ({
      id: m.id,
      title: m.title,
      artist: m.artist,
      url: m.file_url || null,
      subfolder: m.subfolder || null,
      expires_at: expiresAt,
    }));

    console.log("[Download:success]", { userId: user.id, files: urls.length, isAdmin });

    return new Response(JSON.stringify({ files: urls }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Download:error]", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
