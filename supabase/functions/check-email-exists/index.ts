import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { rateLimit, getClientIp, makeServiceClient } from "../_shared/rate-limit.ts";

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const { email } = await req.json();
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const service = makeServiceClient();
    const ip = getClientIp(req);

    // Rate-limit por IP: 10 chamadas / minuto
    const rl = await rateLimit(service, `check-email:${ip}`, 60, 10);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Resposta honesta apenas se o chamador estiver autenticado (uso interno).
    const authHeader = req.headers.get("Authorization");
    let isAuthed = false;
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await userClient.auth.getUser();
      isAuthed = !!data?.user;
    }

    if (!isAuthed) {
      // Chamada anônima: sempre devolve resposta neutra para impedir enumeração.
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data } = await service
      .from("profiles")
      .select("id")
      .ilike("email", normalized)
      .maybeSingle();

    return new Response(JSON.stringify({ exists: !!data }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-email-exists error");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
