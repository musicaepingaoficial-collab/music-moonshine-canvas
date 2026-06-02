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

  let body: { target_user_id?: string } = {};
  try { body = await req.json(); } catch {}
  const targetUserId = body.target_user_id;
  if (!targetUserId || typeof targetUserId !== "string" || !/^[0-9a-f-]{36}$/i.test(targetUserId)) {
    return new Response(JSON.stringify({ error: "target_user_id inválido" }), {
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
  const callerId: string = claims.claims.sub;

  if (callerId === targetUserId) {
    return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo. Use a opção de exclusão de conta." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Check caller is admin
  const { data: isAdminData, error: roleErr } = await admin.rpc("has_role", {
    _user_id: callerId,
    _role: "admin",
  });
  if (roleErr || !isAdminData) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Delete dependent data
  const repIds = (await admin.from("repertorios").select("id").eq("user_id", targetUserId)).data?.map((r: any) => r.id) ?? [];
  if (repIds.length) {
    await admin.from("repertorio_musicas").delete().in("repertorio_id", repIds);
  }
  await admin.from("repertorios").delete().eq("user_id", targetUserId);
  await admin.from("favoritos").delete().eq("user_id", targetUserId);
  await admin.from("downloads").delete().eq("user_id", targetUserId);
  await admin.from("active_sessions").delete().eq("user_id", targetUserId);
  await admin.from("admin_push_subscriptions").delete().eq("user_id", targetUserId);
  await admin.from("admin_notification_prefs").delete().eq("user_id", targetUserId);
  await admin.from("afiliados").delete().eq("user_id", targetUserId);
  await admin.from("indicacoes").update({ referred_user_id: null }).eq("referred_user_id", targetUserId);
  await admin.from("assinaturas").delete().eq("user_id", targetUserId);
  await admin.from("pdf_purchases").delete().eq("user_id", targetUserId);
  await admin.from("user_roles").delete().eq("user_id", targetUserId);
  await admin.from("profiles").delete().eq("id", targetUserId);

  // Log
  await admin.from("admin_access_logs").insert({
    admin_id: callerId,
    target_user_id: targetUserId,
    action: "delete_user",
    details: { source: "admin-delete-user" },
  });

  // Delete from auth
  const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
