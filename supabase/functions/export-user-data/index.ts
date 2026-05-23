import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claims.claims.sub;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [profile, assinaturas, favoritos, downloads, repertorios, pdfPurchases, consents, sessions, roles] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("assinaturas").select("*").eq("user_id", userId),
    admin.from("favoritos").select("*").eq("user_id", userId),
    admin.from("downloads").select("*").eq("user_id", userId),
    admin.from("repertorios").select("*, repertorio_musicas(*)").eq("user_id", userId),
    admin.from("pdf_purchases").select("*").eq("user_id", userId),
    admin.from("consent_logs").select("*").eq("user_id", userId),
    admin.from("active_sessions").select("*").eq("user_id", userId),
    admin.from("user_roles").select("*").eq("user_id", userId),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    profile: profile.data,
    assinaturas: assinaturas.data,
    favoritos: favoritos.data,
    downloads: downloads.data,
    repertorios: repertorios.data,
    pdf_purchases: pdfPurchases.data,
    consent_logs: consents.data,
    active_sessions: sessions.data,
    roles: roles.data,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
