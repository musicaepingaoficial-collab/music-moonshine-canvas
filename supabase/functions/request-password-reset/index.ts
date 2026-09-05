import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

const TOKEN_TTL_MINUTES = 60;
const PASSWORD_RESET_BASE_URL = "https://musicaepinga.shop";

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
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "E-mail inválido" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("id, name, email")
      .eq("email", email)
      .maybeSingle();

    // Resposta neutra: nunca revela se o e-mail existe.
    if (!profile?.id) return json({ ok: true });

    const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const tokenHash = await sha256(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    // Invalida tokens anteriores ainda válidos.
    await admin
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", profile.id)
      .is("used_at", null);

    const { error: insertErr } = await admin.from("password_reset_tokens").insert({
      user_id: profile.id,
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    // O link de e-mail deve sempre abrir o domínio público, mesmo quando o
    // pedido é feito pelo preview, localhost ou pelo painel administrativo.
    const link = `${PASSWORD_RESET_BASE_URL}/reset-password?token=${rawToken}`;
    const firstName = (profile.name || "").split(" ")[0] || "";

    const html = `
      <h2>Redefinir sua senha</h2>
      <p>Olá${firstName ? ` ${firstName}` : ""}, recebemos um pedido para criar uma nova senha na sua conta Música e Pinga.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${link}" style="background:#f97316;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Criar nova senha</a>
      </p>
      <p>Este link é válido por ${TOKEN_TTL_MINUTES} minutos e pode ser usado uma única vez.</p>
      <p style="font-size:13px;color:#666;">Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.</p>
      <p style="font-size:12px;color:#999;word-break:break-all;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${link}</p>
    `;

    const sendRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ to: email, subject: "Redefinir sua senha - Música e Pinga", html }),
    });

    if (!sendRes.ok) {
      console.error("Falha ao enviar e-mail de redefinição:", await sendRes.text());
      return json({ error: "Não foi possível enviar o e-mail agora. Tente novamente." }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("request-password-reset error:", err);
    return json({ error: "Erro inesperado" }, 500);
  }
});
