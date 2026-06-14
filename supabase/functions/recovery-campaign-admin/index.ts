// API admin da campanha de recuperação.
// Requer JWT de usuário com role 'admin'.
//
// Endpoints (POST com {action}):
//   - stats          -> totais e métricas por step
//   - recipients     -> lista paginada (filtros: step, status, q, page, pageSize)
//   - eligible       -> próximos a receber
//   - run_now        -> dispara send-recovery-emails imediatamente
//   - save_config    -> atualiza recovery_campaign_config
//   - get_config     -> retorna config atual
//   - send_test      -> envia email de teste do step X para email arbitrário
//   - timeseries     -> envios/aberturas/conversões por dia (últimos 30 dias)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersFor } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://musicaepinga.shop";

const svc = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const token = auth.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) return null;
  const supabase = svc();
  const { data: roles } = await supabase.from("user_roles")
    .select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!roles) return null;
  return data.user;
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const hasAuth = (req.headers.get("Authorization") || "").startsWith("Bearer ");
  if (!hasAuth) {
    console.warn("[recovery-campaign-admin] missing Authorization header");
    return json({ error: "Unauthorized", reason: "missing_token" }, 401);
  }
  const user = await requireAdmin(req);
  if (!user) {
    console.warn("[recovery-campaign-admin] not admin");
    return json({ error: "Unauthorized", reason: "not_admin" }, 403);
  }

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const action = body.action as string | undefined;
  console.log(`[recovery-campaign-admin] action=${action} user=${user.id}`);
  const supabase = svc();

  try {
    if (action === "get_config") {
      const { data } = await supabase.from("recovery_campaign_config").select("*").eq("id", "default").maybeSingle();
      return json({ config: data });
    }

    if (action === "save_config") {
      const fields = body.config ?? {};
      delete fields.id; delete fields.updated_at;
      const { data, error } = await supabase.from("recovery_campaign_config")
        .update({ ...fields, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq("id", "default").select().maybeSingle();
      if (error) throw error;
      return json({ config: data });
    }

    if (action === "stats") {
      // contagem por step (logs)
      const { data: logs } = await supabase.from("recovery_campaign_log")
        .select("step, status, opened_at, converted_at");
      const byStep: Record<number, { sent: number; failed: number; opened: number; converted: number }> = {
        1: { sent: 0, failed: 0, opened: 0, converted: 0 },
        2: { sent: 0, failed: 0, opened: 0, converted: 0 },
        3: { sent: 0, failed: 0, opened: 0, converted: 0 },
      };
      for (const l of logs ?? []) {
        const s = byStep[(l as any).step];
        if (!s) continue;
        if ((l as any).status === "sent") s.sent++;
        else if ((l as any).status === "failed") s.failed++;
        if ((l as any).opened_at) s.opened++;
        if ((l as any).converted_at) s.converted++;
      }

      // elegíveis hoje (sem assinatura, não admin, com email)
      const { count: profilesTotal } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const { count: subsCount } = await supabase.from("assinaturas").select("user_id", { count: "exact", head: true });
      // aproximação: elegíveis = profiles com email - quem tem assinatura - quem já recebeu step 3
      const { data: profiles } = await supabase.from("profiles")
        .select("id, email").not("email", "is", null).neq("email", "").limit(2000);
      const ids = (profiles ?? []).map((p: any) => p.id);
      const { data: subs } = await supabase.from("assinaturas").select("user_id").in("user_id", ids);
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin").in("user_id", ids);
      const hasSub = new Set((subs ?? []).map((s: any) => s.user_id));
      const isAdm = new Set((admins ?? []).map((r: any) => r.user_id));
      const eligible = (profiles ?? []).filter((p: any) => !hasSub.has(p.id) && !isAdm.has(p.id)).length;

      return json({ byStep, eligible, profilesTotal, subsCount });
    }

    if (action === "timeseries") {
      const days = Number(body.days ?? 30);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data: logs } = await supabase.from("recovery_campaign_log")
        .select("sent_at, opened_at, converted_at, status").gte("sent_at", since);
      const map = new Map<string, { sent: number; opened: number; converted: number }>();
      const dayKey = (d: string) => d.slice(0, 10);
      for (const l of logs ?? []) {
        const k = dayKey((l as any).sent_at);
        const row = map.get(k) ?? { sent: 0, opened: 0, converted: 0 };
        if ((l as any).status === "sent") row.sent++;
        if ((l as any).opened_at) row.opened++;
        if ((l as any).converted_at) row.converted++;
        map.set(k, row);
      }
      const series = [...map.entries()].sort(([a],[b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }));
      return json({ series });
    }

    if (action === "recipients") {
      const page = Math.max(1, Number(body.page ?? 1));
      const pageSize = Math.min(200, Math.max(1, Number(body.pageSize ?? 50)));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase.from("recovery_campaign_log")
        .select("id, user_id, email, step, status, sent_at, opened_at, converted_at, error", { count: "exact" })
        .order("sent_at", { ascending: false }).range(from, to);

      if (body.step) q = q.eq("step", Number(body.step));
      if (body.status === "sent") q = q.eq("status", "sent").is("opened_at", null).is("converted_at", null);
      else if (body.status === "failed") q = q.eq("status", "failed");
      else if (body.status === "opened") q = q.not("opened_at", "is", null);
      else if (body.status === "converted") q = q.not("converted_at", "is", null);
      if (body.q) q = q.ilike("email", `%${body.q}%`);

      const { data: rows, count } = await q;

      // enriquecer com nome
      const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, name").in("id", userIds)
        : { data: [] as any[] };
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.name]));

      return json({
        rows: (rows ?? []).map((r: any) => ({ ...r, name: nameMap.get(r.user_id) ?? null })),
        total: count ?? 0, page, pageSize,
      });
    }

    if (action === "eligible") {
      // chama a mesma lógica do send-recovery-emails mas em dry-run, retornando até 200
      const { data: profiles } = await supabase.from("profiles")
        .select("id, email, name").not("email", "is", null).neq("email", "").limit(2000);
      const ids = (profiles ?? []).map((p: any) => p.id);
      if (ids.length === 0) return json({ rows: [] });
      const [{ data: subs }, { data: admins }, { data: logs }, { data: cfg }] = await Promise.all([
        supabase.from("assinaturas").select("user_id").in("user_id", ids),
        supabase.from("user_roles").select("user_id").eq("role","admin").in("user_id", ids),
        supabase.from("recovery_campaign_log").select("user_id, step, sent_at").in("user_id", ids),
        supabase.from("recovery_campaign_config").select("*").eq("id","default").maybeSingle(),
      ]);
      const hasSub = new Set((subs ?? []).map((s: any) => s.user_id));
      const isAdm = new Set((admins ?? []).map((r: any) => r.user_id));
      const logMap = new Map<string, any[]>();
      for (const l of logs ?? []) {
        const arr = logMap.get((l as any).user_id) ?? [];
        arr.push(l); logMap.set((l as any).user_id, arr);
      }
      const now = Date.now(); const DAY = 86400000;
      const step2Delay = (cfg as any)?.step2_delay_days ?? 3;
      const step3Delay = (cfg as any)?.step3_delay_days ?? 4;
      const rows: any[] = [];
      for (const p of profiles ?? []) {
        if (hasSub.has(p.id) || isAdm.has(p.id)) continue;
        const ul = logMap.get(p.id) ?? [];
        const steps = new Set(ul.map(l => l.step));
        if (!steps.has(1)) rows.push({ ...p, next_step: 1, reason: "Primeiro contato" });
        else if (!steps.has(2)) {
          const s1 = ul.find(l => l.step===1);
          const elapsed = (now - new Date(s1.sent_at).getTime())/DAY;
          if (elapsed >= step2Delay) rows.push({ ...p, next_step: 2, reason: `Recebeu step 1 há ${elapsed.toFixed(1)} dias` });
        } else if (!steps.has(3)) {
          const s2 = ul.find(l => l.step===2);
          const elapsed = (now - new Date(s2.sent_at).getTime())/DAY;
          if (elapsed >= step3Delay) rows.push({ ...p, next_step: 3, reason: `Recebeu step 2 há ${elapsed.toFixed(1)} dias` });
        }
      }
      return json({ rows: rows.slice(0, 200), total: rows.length });
    }

    if (action === "run_now") {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-recovery-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ triggered_by: `admin:${user.id}` }),
      });
      const text = await r.text();
      return json({ ok: r.ok, status: r.status, response: text });
    }

    if (action === "send_test") {
      const step = Number(body.step ?? 1) as 1|2|3;
      const to = String(body.to ?? user.email ?? "");
      if (!to) return json({ error: "destinatário ausente" }, 400);
      const { data: cfg } = await supabase.from("recovery_campaign_config").select("*").eq("id","default").maybeSingle();
      if (!cfg) return json({ error: "config ausente" }, 500);
      const subject = (cfg as any)[`step${step}_subject`];
      const html = (cfg as any)[`step${step}_html`];
      const cupom = step === 1 ? "" : (cfg as any)[`step${step}_cupom`];
      const planosUrl = `${SITE_URL}/#planos${cupom ? `?cupom=${cupom}` : ""}`;
      const rendered = renderTemplate(html, {
        FIRST_NAME: "Teste", CUPOM: cupom, PLANOS_URL: planosUrl, SITE_URL,
      }) + `<p style="color:#888;font-size:12px;margin-top:30px;">[Email de teste — disparado por ${user.email}]</p>`;

      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ to, subject: `[TESTE] ${subject}`, html: rendered }),
      });
      const txt = await r.text();
      return json({ ok: r.ok, status: r.status, response: txt });
    }

    return json({ error: "ação desconhecida" }, 400);
  } catch (err: any) {
    console.error("recovery-campaign-admin", err);
    return json({ error: err?.message ?? String(err) }, 500);
  }
});
