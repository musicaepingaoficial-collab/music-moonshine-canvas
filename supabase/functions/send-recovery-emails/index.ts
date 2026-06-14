// Envio da campanha de recuperação — usa recovery_campaign_config para textos/cupons/atrasos.
// Antes de enviar, INSERE o log como 'pending' pra obter o ID, injeta o pixel de tracking
// no HTML e depois atualiza pra 'sent'/'failed'. Também rotaciona conversões
// (assinaturas criadas após o envio).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersFor } from "../_shared/cors.ts";

const SITE_URL = Deno.env.get("SITE_URL") || "https://musicaepinga.shop";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface User { id: string; email: string; name: string | null; }
interface Config {
  enabled: boolean;
  step1_subject: string; step1_html: string;
  step2_subject: string; step2_html: string; step2_cupom: string;
  step3_subject: string; step3_html: string; step3_cupom: string;
  step2_delay_days: number; step3_delay_days: number; batch_limit: number;
}

function renderTemplate(html: string, vars: Record<string,string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function buildEmail(cfg: Config, step: 1|2|3, name: string|null, logId: string): { subject: string; html: string } {
  const firstName = (name?.split(" ")[0] || "amigo").trim();
  const cupom = step === 1 ? "" : (step === 2 ? cfg.step2_cupom : cfg.step3_cupom);
  const planosUrl = `${SITE_URL}/#planos${cupom ? `?cupom=${cupom}` : ""}`;
  const subject = step === 1 ? cfg.step1_subject : step === 2 ? cfg.step2_subject : cfg.step3_subject;
  const tpl = step === 1 ? cfg.step1_html : step === 2 ? cfg.step2_html : cfg.step3_html;
  const body = renderTemplate(tpl, { FIRST_NAME: firstName, CUPOM: cupom, PLANOS_URL: planosUrl, SITE_URL });
  const pixel = `<img src="${SUPABASE_URL}/functions/v1/track-email-open?lid=${logId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`;
  return { subject, html: body + pixel };
}

async function sendOne(to: string, subject: string, html: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ to, subject, html }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0,400)}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const { data: cfgData } = await supabase
      .from("recovery_campaign_config").select("*").eq("id", "default").maybeSingle();
    const cfg = cfgData as Config | null;
    if (!cfg) return json({ ok: false, error: "config ausente" }, 500);
    if (!cfg.enabled) return json({ ok: true, skipped: "campanha desativada" });

    // Atualiza conversões: assinaturas criadas após o envio do email
    await supabase.rpc("update_updated_at_column").catch(() => {});
    // Usamos um update direto via raw SQL não é possível pela lib; fazemos em duas etapas.
    const { data: pendingConv } = await supabase
      .from("recovery_campaign_log")
      .select("id, user_id, sent_at")
      .is("converted_at", null);
    if (pendingConv && pendingConv.length) {
      const ids = [...new Set(pendingConv.map((p: any) => p.user_id))];
      const { data: subs } = await supabase.from("assinaturas").select("user_id, created_at").in("user_id", ids);
      const subByUser = new Map<string, string>();
      for (const s of subs ?? []) {
        const prev = subByUser.get((s as any).user_id);
        if (!prev || new Date((s as any).created_at).getTime() < new Date(prev).getTime()) {
          subByUser.set((s as any).user_id, (s as any).created_at);
        }
      }
      for (const p of pendingConv) {
        const createdAt = subByUser.get((p as any).user_id);
        if (createdAt && new Date(createdAt) > new Date((p as any).sent_at)) {
          await supabase.from("recovery_campaign_log")
            .update({ converted_at: createdAt }).eq("id", (p as any).id);
          await supabase.from("recovery_email_events").insert({
            log_id: (p as any).id, event_type: "convert",
          });
        }
      }
    }

    // Carrega elegíveis
    const { data: profiles } = await supabase
      .from("profiles").select("id, email, name")
      .not("email", "is", null).neq("email", "").limit(1000);
    const userIds = (profiles ?? []).map((p: any) => p.id);
    if (!userIds.length) return json({ ok: true, results: { processed: 0 } });

    const [{ data: subs }, { data: admins }, { data: logs }] = await Promise.all([
      supabase.from("assinaturas").select("user_id").in("user_id", userIds),
      supabase.from("user_roles").select("user_id").eq("role","admin").in("user_id", userIds),
      supabase.from("recovery_campaign_log").select("user_id, step, sent_at").in("user_id", userIds),
    ]);
    const hasSub = new Set((subs ?? []).map((s: any) => s.user_id));
    const isAdm = new Set((admins ?? []).map((r: any) => r.user_id));
    const logMap = new Map<string, { step:number; sent_at:string }[]>();
    for (const l of logs ?? []) {
      const arr = logMap.get((l as any).user_id) ?? [];
      arr.push({ step: (l as any).step, sent_at: (l as any).sent_at });
      logMap.set((l as any).user_id, arr);
    }

    const now = Date.now(); const DAY = 86400000;
    const queue: { user: User; step: 1|2|3 }[] = [];
    for (const u of (profiles ?? []) as User[]) {
      if (hasSub.has(u.id) || isAdm.has(u.id)) continue;
      const ul = logMap.get(u.id) ?? [];
      const steps = new Set(ul.map(l => l.step));
      if (!steps.has(1)) queue.push({ user: u, step: 1 });
      else if (!steps.has(2)) {
        const s1 = ul.find(l => l.step===1)!;
        if (now - new Date(s1.sent_at).getTime() >= cfg.step2_delay_days*DAY) queue.push({ user: u, step: 2 });
      } else if (!steps.has(3)) {
        const s2 = ul.find(l => l.step===2)!;
        if (now - new Date(s2.sent_at).getTime() >= cfg.step3_delay_days*DAY) queue.push({ user: u, step: 3 });
      }
    }

    const batch = queue.slice(0, cfg.batch_limit);
    const results = { step1: 0, step2: 0, step3: 0, failed: 0 };

    for (const item of batch) {
      // INSERT pending pra obter o id
      const { data: logRow, error: insErr } = await supabase.from("recovery_campaign_log")
        .insert({ user_id: item.user.id, email: item.user.email, step: item.step, status: "pending" })
        .select("id").maybeSingle();
      if (insErr || !logRow) {
        results.failed++;
        continue;
      }
      const { subject, html } = buildEmail(cfg, item.step, item.user.name, (logRow as any).id);
      const r = await sendOne(item.user.email, subject, html);

      await supabase.from("recovery_campaign_log")
        .update({ status: r.ok ? "sent" : "failed", error: r.ok ? null : r.error?.slice(0,500) })
        .eq("id", (logRow as any).id);

      if (r.ok) {
        if (item.step === 1) results.step1++;
        else if (item.step === 2) results.step2++;
        else results.step3++;
      } else {
        results.failed++;
      }
      await new Promise(r => setTimeout(r, 150));
    }

    return json({ ok: true, eligible: queue.length, processed: batch.length, results });
  } catch (err: any) {
    console.error("send-recovery-emails", err);
    return json({ ok: false, error: err?.message ?? String(err) }, 500);
  }
});
