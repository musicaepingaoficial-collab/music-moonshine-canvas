import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Play, Save, Send, MailWarning, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

type Config = {
  enabled: boolean;
  step1_subject: string; step1_html: string;
  step2_subject: string; step2_html: string; step2_cupom: string;
  step3_subject: string; step3_html: string; step3_cupom: string;
  step2_delay_days: number; step3_delay_days: number; batch_limit: number;
};

async function call(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("recovery-campaign-admin", {
    body: { action, ...body },
  });
  if (error) throw error;
  return data as any;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function AdminRecuperacaoPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");

  const statsQ = useQuery({ queryKey: ["rc-stats"], queryFn: () => call("stats") });
  const tsQ = useQuery({ queryKey: ["rc-ts"], queryFn: () => call("timeseries", { days: 30 }) });
  const cfgQ = useQuery({ queryKey: ["rc-cfg"], queryFn: () => call("get_config") });

  const runNow = useMutation({
    mutationFn: () => call("run_now"),
    onSuccess: (d) => {
      toast({ title: "Campanha disparada", description: `Status ${d.status}` });
      qc.invalidateQueries({ queryKey: ["rc-stats"] });
      qc.invalidateQueries({ queryKey: ["rc-ts"] });
      qc.invalidateQueries({ queryKey: ["rc-recipients"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const stats = statsQ.data;
  const byStep = stats?.byStep ?? { 1:{sent:0,opened:0,converted:0,failed:0}, 2:{sent:0,opened:0,converted:0,failed:0}, 3:{sent:0,opened:0,converted:0,failed:0} };
  const totalSent = (byStep[1]?.sent ?? 0) + (byStep[2]?.sent ?? 0) + (byStep[3]?.sent ?? 0);
  const totalOpened = (byStep[1]?.opened ?? 0) + (byStep[2]?.opened ?? 0) + (byStep[3]?.opened ?? 0);
  const totalConv = (byStep[1]?.converted ?? 0) + (byStep[2]?.converted ?? 0) + (byStep[3]?.converted ?? 0);
  const openRate = totalSent ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const convRate = totalSent ? ((totalConv / totalSent) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MailWarning className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Recuperação por Email</h1>
            <p className="text-sm text-muted-foreground">Campanha em 3 etapas para usuários free.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={cfgQ.data?.config?.enabled ? "default" : "secondary"}>
            {cfgQ.data?.config?.enabled ? "Ativa" : "Pausada"}
          </Badge>
          <Button onClick={() => runNow.mutate()} disabled={runNow.isPending}>
            {runNow.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Disparar agora
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="recipients">Destinatários</TabsTrigger>
          <TabsTrigger value="eligible">Próximos envios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Elegíveis hoje" value={stats?.eligible ?? "—"} />
            <StatCard label="Enviados" value={totalSent} />
            <StatCard label="Abertos" value={totalOpened} sub={`${openRate}% de abertura`} />
            <StatCard label="Convertidos" value={totalConv} sub={`${convRate}% de conversão`} />
            <StatCard label="Falhas" value={byStep[1]?.failed + byStep[2]?.failed + byStep[3]?.failed} />
          </div>

          <Card>
            <CardHeader><CardTitle>Por etapa</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Step</TableHead><TableHead>Enviados</TableHead><TableHead>Abertos</TableHead><TableHead>Convertidos</TableHead><TableHead>Taxa Abertura</TableHead><TableHead>Taxa Conversão</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {[1,2,3].map(s => {
                    const r = byStep[s] ?? { sent:0, opened:0, converted:0 };
                    const oa = r.sent ? ((r.opened/r.sent)*100).toFixed(1) : "0";
                    const co = r.sent ? ((r.converted/r.sent)*100).toFixed(1) : "0";
                    return (
                      <TableRow key={s}>
                        <TableCell><Badge variant="outline">Step {s}</Badge></TableCell>
                        <TableCell>{r.sent}</TableCell>
                        <TableCell>{r.opened}</TableCell>
                        <TableCell>{r.converted}</TableCell>
                        <TableCell>{oa}%</TableCell>
                        <TableCell>{co}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Últimos 30 dias</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tsQ.data?.series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#10b981" name="Enviados" />
                  <Line type="monotone" dataKey="opened" stroke="#3b82f6" name="Abertos" />
                  <Line type="monotone" dataKey="converted" stroke="#f59e0b" name="Convertidos" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          {cfgQ.data?.config && <ConfigForm initial={cfgQ.data.config} onSaved={() => qc.invalidateQueries({ queryKey: ["rc-cfg"] })} />}
        </TabsContent>

        <TabsContent value="recipients">
          <RecipientsTable />
        </TabsContent>

        <TabsContent value="eligible">
          <EligibleTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigForm({ initial, onSaved }: { initial: Config; onSaved: () => void }) {
  const [cfg, setCfg] = useState<Config>(initial);
  const [testTo, setTestTo] = useState("");
  const [testStep, setTestStep] = useState<1|2|3>(1);

  const save = useMutation({
    mutationFn: () => call("save_config", { config: cfg }),
    onSuccess: () => { toast({ title: "Configuração salva" }); onSaved(); },
    onError: (e: any) => toast({ title: "Erro", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const sendTest = useMutation({
    mutationFn: () => call("send_test", { to: testTo, step: testStep }),
    onSuccess: (d: any) => toast({ title: d.ok ? "Teste enviado" : "Falha", description: d.response?.slice(0, 200) }),
  });

  const update = <K extends keyof Config>(k: K, v: Config[K]) => setCfg(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={cfg.enabled} onCheckedChange={(v) => update("enabled", v)} />
            <Label>Campanha ativa</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label>Atraso step 2 (dias)</Label>
            <Input type="number" className="w-20" value={cfg.step2_delay_days} onChange={(e) => update("step2_delay_days", Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <Label>Atraso step 3 (dias)</Label>
            <Input type="number" className="w-20" value={cfg.step3_delay_days} onChange={(e) => update("step3_delay_days", Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <Label>Lote por execução</Label>
            <Input type="number" className="w-24" value={cfg.batch_limit} onChange={(e) => update("batch_limit", Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      {([1,2,3] as const).map((s) => {
        const subjectKey = `step${s}_subject` as const;
        const htmlKey = `step${s}_html` as const;
        const cupomKey = s === 1 ? null : (`step${s}_cupom` as keyof Config);
        const html = cfg[htmlKey] as string;
        return (
          <Card key={s}>
            <CardHeader><CardTitle>Email {s}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Assunto</Label>
                <Input value={cfg[subjectKey] as string} onChange={(e) => update(subjectKey, e.target.value as any)} />
              </div>
              {cupomKey && (
                <div>
                  <Label>Cupom</Label>
                  <Input value={cfg[cupomKey] as string} onChange={(e) => update(cupomKey, e.target.value as any)} />
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>HTML (variáveis: {"{{FIRST_NAME}}, {{CUPOM}}, {{PLANOS_URL}}"})</Label>
                  <Textarea rows={12} value={html} onChange={(e) => update(htmlKey, e.target.value as any)} className="font-mono text-xs" />
                </div>
                <div>
                  <Label>Preview</Label>
                  <div className="border rounded-md p-4 bg-white text-black h-[280px] overflow-auto" dangerouslySetInnerHTML={{ __html: html.replace(/\{\{FIRST_NAME\}\}/g, "Fulano").replace(/\{\{CUPOM\}\}/g, (cfg as any)[`step${s}_cupom`] ?? "").replace(/\{\{PLANOS_URL\}\}/g, "#") }} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar configuração
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Label>Teste:</Label>
            <select value={testStep} onChange={(e) => setTestStep(Number(e.target.value) as 1|2|3)} className="border rounded px-2 py-1 bg-background">
              <option value={1}>Step 1</option><option value={2}>Step 2</option><option value={3}>Step 3</option>
            </select>
            <Input placeholder="seu@email.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="w-64" />
            <Button variant="outline" onClick={() => sendTest.mutate()} disabled={!testTo || sendTest.isPending}>
              <Send className="h-4 w-4 mr-2" /> Enviar teste
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecipientsTable() {
  const [step, setStep] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const dataQ = useQuery({
    queryKey: ["rc-recipients", step, status, q, page],
    queryFn: () => call("recipients", { step: step || undefined, status: status || undefined, q: q || undefined, page, pageSize: 50 }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Buscar email..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-64" />
          <select value={step} onChange={(e) => { setStep(e.target.value); setPage(1); }} className="border rounded px-2 py-1 bg-background">
            <option value="">Todos os steps</option><option value="1">Step 1</option><option value="2">Step 2</option><option value="3">Step 3</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border rounded px-2 py-1 bg-background">
            <option value="">Todos status</option>
            <option value="sent">Enviados</option>
            <option value="opened">Abertos</option>
            <option value="converted">Convertidos</option>
            <option value="failed">Falhas</option>
          </select>
          <Badge variant="outline" className="ml-auto">Total: {dataQ.data?.total ?? 0}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Step</TableHead><TableHead>Status</TableHead><TableHead>Enviado</TableHead><TableHead>Aberto</TableHead><TableHead>Convertido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(dataQ.data?.rows ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.email}</TableCell>
                <TableCell><Badge variant="outline">{r.step}</Badge></TableCell>
                <TableCell>
                  <Badge variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-xs">{r.opened_at ? new Date(r.opened_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-xs">{r.converted_at ? new Date(r.converted_at).toLocaleString() : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center mt-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page}</span>
          <Button variant="outline" size="sm" disabled={(dataQ.data?.rows?.length ?? 0) < 50} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EligibleTable() {
  const dataQ = useQuery({ queryKey: ["rc-eligible"], queryFn: () => call("eligible") });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próxima execução</CardTitle>
        <p className="text-sm text-muted-foreground">{dataQ.data?.total ?? 0} usuários serão processados</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Próximo step</TableHead><TableHead>Motivo</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(dataQ.data?.rows ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.email}</TableCell>
                <TableCell><Badge>Step {r.next_step}</Badge></TableCell>
                <TableCell className="text-xs">{r.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
