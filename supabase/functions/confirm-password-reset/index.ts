import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");

    if (!token || token.length < 32) return json({ error: "Link inválido" }, 400);
    if (password.length < 6) return json({ error: "A senha deve ter pelo menos 6 caracteres." }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tokenHash = await sha256(token);
    const { data: row } = await admin
      .from("password_reset_tokens")
      .select("id, user_id, email, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!row) return json({ error: "Link inválido ou já utilizado." }, 400);
    if (row.used_at) return json({ error: "Este link já foi utilizado. Solicite um novo." }, 400);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: "Este link expirou. Solicite um novo." }, 400);
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(row.user_id, { password });
    if (updErr) return json({ error: updErr.message }, 400);

    await admin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    return json({ ok: true, email: row.email });
  } catch (err) {
    console.error("confirm-password-reset error:", err);
    return json({ error: "Erro inesperado" }, 500);
  }
});
