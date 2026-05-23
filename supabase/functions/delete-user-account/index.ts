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

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch {}
  if (body.confirm !== "DELETAR MINHA CONTA") {
    return new Response(JSON.stringify({ error: "Confirmação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  const userId: string = claims.claims.sub;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date().toISOString();

  // Anonimizar profile (mantém id, financeiro)
  await admin.from("profiles").update({
    name: "[anonimizado]",
    email: `deleted_${userId}@anon.local`,
    whatsapp: null,
    cpf: null,
    avatar_url: null,
    anonymized_at: now,
  }).eq("id", userId);

  // Anonimizar assinaturas (mantém histórico por 5 anos)
  await admin.from("assinaturas").update({ anonymized_at: now }).eq("user_id", userId);

  // Apagar dados não-financeiros
  const repIds = (await admin.from("repertorios").select("id").eq("user_id", userId)).data?.map(r => r.id) ?? [];
  if (repIds.length) {
    await admin.from("repertorio_musicas").delete().in("repertorio_id", repIds);
  }
  await admin.from("repertorios").delete().eq("user_id", userId);
  await admin.from("favoritos").delete().eq("user_id", userId);
  await admin.from("downloads").delete().eq("user_id", userId);
  await admin.from("active_sessions").delete().eq("user_id", userId);
  await admin.from("admin_push_subscriptions").delete().eq("user_id", userId);
  await admin.from("afiliados").delete().eq("user_id", userId);
  await admin.from("indicacoes").update({ referred_user_id: null }).eq("referred_user_id", userId);

  // Log final
  await admin.from("consent_logs").insert({
    user_id: userId,
    consent_type: "privacy",
    granted: false,
    version: "delete",
    user_agent: req.headers.get("user-agent"),
  });

  // Deletar do Auth
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
