// Envio de campanha de recuperação para usuários free.
// Disparada por pg_cron diariamente (e pode ser disparada manualmente por admin).
//
// Regras de tempo:
//   step 1 -> usuário nunca recebeu nada (entra na campanha hoje)
//   step 2 -> usuário recebeu step 1 há >= 3 dias
//   step 3 -> usuário recebeu step 2 há >= 4 dias
//
// Critérios de elegibilidade:
//   - sem nenhuma linha em assinaturas (nunca assinou)
//   - sem role admin
//   - email válido
//
// Cada envio é registrado em recovery_campaign_log (UNIQUE user_id+step),
// evitando duplicatas mesmo se a função rodar duas vezes.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersFor } from "../_shared/cors.ts";

const SITE_URL = Deno.env.get("SITE_URL") || "https://musicaepinga.shop";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_LIMIT = 100;

interface User { id: string; email: string; name: string | null; }

function buildEmail(step: 1 | 2 | 3, name: string | null): { subject: string; html: string } {
  const firstName = (name?.split(" ")[0] || "amigo").trim();
  const planosUrl = `${SITE_URL}/#planos`;

  if (step === 1) {
    return {
      subject: "Sentimos sua falta no Música e Pinga 🎵",
      html: `
        <h2>Olá ${firstName}!</h2>
        <p>Notamos que você criou sua conta no <strong>Música e Pinga</strong> mas ainda não aproveitou tudo que preparamos pra você.</p>
        <p>Com um plano ativo você libera:</p>
        <ul>
          <li>🎶 Acervo completo com milhares de faixas organizadas por estilo</li>
          <li>⬇️ Downloads ilimitados</li>
          <li>📂 Repertórios prontos e personalizáveis</li>
          <li>🎼 PDFs, cifras e materiais exclusivos</li>
        </ul>
        <p><a class="button" href="${planosUrl}">Ver planos</a></p>
        <p>Te esperamos lá dentro! 🍻</p>
      `,
    };
  }

  if (step === 2) {
    const url = `${planosUrl}?cupom=VOLTA20`;
    return {
      subject: "Liberamos 20% OFF só pra você voltar 🎁",
      html: `
        <h2>Olá ${firstName}, separamos um presente pra você!</h2>
        <p>Aplicamos um cupom de <strong>20% de desconto</strong> em qualquer plano para você experimentar tudo que o <strong>Música e Pinga</strong> tem a oferecer.</p>
        <p style="text-align:center;font-size:22px;letter-spacing:2px;border:2px dashed #10b981;padding:14px;border-radius:8px;margin:24px 0;">
          <strong>VOLTA20</strong>
        </p>
        <p>Use o cupom no checkout e libere o acesso completo. Vai durar pouco — aproveite enquanto está disponível.</p>
        <p><a class="button" href="${url}">Quero meu desconto</a></p>
      `,
    };
  }

  const url = `${planosUrl}?cupom=ULTIMA40`;
  return {
    subject: "⏰ Última chance: 40% OFF expira em 24h",
    html: `
      <h2>${firstName}, essa é a última chamada!</h2>
      <p>Como você ainda não assinou, liberamos nosso <strong>maior desconto</strong>: <strong>40% OFF</strong> em qualquer plano.</p>
      <p style="text-align:center;font-size:22px;letter-spacing:2px;border:2px dashed #ef4444;padding:14px;border-radius:8px;margin:24px 0;">
        <strong>ULTIMA40</strong>
      </p>
      <p>Esse cupom <strong>expira em 24 horas</strong> e não vamos repetir essa oferta. Garante o seu agora 👇</p>
      <p><a class="button" href="${url}">Assinar com 40% OFF</a></p>
      <p style="color:#888;font-size:13px;">Se preferir não receber mais nossos avisos, é só responder este e-mail.</p>
    `,
  };
}

async function sendOne(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${txt}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const results = { step1: 0, step2: 0, step3: 0, failed: 0 };

  try {
    // STEP 1: usuários que nunca assinaram e nunca receberam nada
    const { data: step1Users, error: e1 } = await supabase.rpc as any;
    // RPC não existe — usamos query direta com SQL via .from + filtros.
    // Como Postgrest não tem NOT EXISTS direto, usamos uma abordagem em duas etapas.

    // 1) carregar usuários elegíveis (até 1000) sem assinatura e não-admin
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, name")
      .not("email", "is", null)
      .neq("email", "")
      .limit(1000);
    if (pErr) throw pErr;

    const userIds = (profiles ?? []).map((p: any) => p.id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, results, message: "Nenhum perfil" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const [{ data: subs }, { data: admins }, { data: logs }] = await Promise.all([
      supabase.from("assinaturas").select("user_id").in("user_id", userIds),
      supabase.from("user_roles").select("user_id").eq("role", "admin").in("user_id", userIds),
      supabase.from("recovery_campaign_log").select("user_id, step, sent_at").in("user_id", userIds),
    ]);

    const hasSub = new Set((subs ?? []).map((s: any) => s.user_id));
    const isAdmin = new Set((admins ?? []).map((r: any) => r.user_id));
    const logByUser = new Map<string, { step: number; sent_at: string }[]>();
    for (const l of logs ?? []) {
      const arr = logByUser.get((l as any).user_id) ?? [];
      arr.push({ step: (l as any).step, sent_at: (l as any).sent_at });
      logByUser.set((l as any).user_id, arr);
    }

    const eligible = (profiles ?? []).filter(
      (p: any) => !hasSub.has(p.id) && !isAdmin.has(p.id)
    ) as User[];

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const queue: { user: User; step: 1 | 2 | 3 }[] = [];
    for (const u of eligible) {
      const userLogs = logByUser.get(u.id) ?? [];
      const steps = new Set(userLogs.map((l) => l.step));
      if (!steps.has(1)) {
        queue.push({ user: u, step: 1 });
      } else if (!steps.has(2)) {
        const s1 = userLogs.find((l) => l.step === 1)!;
        if (now - new Date(s1.sent_at).getTime() >= 3 * DAY) queue.push({ user: u, step: 2 });
      } else if (!steps.has(3)) {
        const s2 = userLogs.find((l) => l.step === 2)!;
        if (now - new Date(s2.sent_at).getTime() >= 4 * DAY) queue.push({ user: u, step: 3 });
      }
    }

    const batch = queue.slice(0, BATCH_LIMIT);

    for (const item of batch) {
      const { subject, html } = buildEmail(item.step, item.user.name);
      const r = await sendOne(item.user.email, subject, html);

      await supabase.from("recovery_campaign_log").insert({
        user_id: item.user.id,
        email: item.user.email,
        step: item.step,
        status: r.ok ? "sent" : "failed",
        error: r.ok ? null : r.error?.slice(0, 500),
      });

      if (r.ok) {
        if (item.step === 1) results.step1++;
        else if (item.step === 2) results.step2++;
        else results.step3++;
      } else {
        results.failed++;
      }

      // pequena pausa pra não sobrecarregar o SMTP
      await new Promise((r) => setTimeout(r, 150));
    }

    return new Response(
      JSON.stringify({ ok: true, total_eligible: eligible.length, processed: batch.length, results }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-recovery-emails error", err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
