import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Copy, Edit, Eye, Users, MousePointerClick, UserPlus, CheckCircle2, DollarSign, Wallet } from "lucide-react";

interface AfiliadoStat {
  afiliado_id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  code: string;
  commission_percent: number;
  clicks: number;
  signups: number;
  conversions: number;
  revenue: number;
  commission_due: number;
}

interface IndicacaoDetail {
  indicacao_id: string;
  referred_user_id: string | null;
  referred_name: string | null;
  referred_email: string | null;
  status: string;
  created_at: string;
  converted_at: string | null;
  plan: string | null;
  price: number | null;
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminAfiliadosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AfiliadoStat | null>(null);
  const [editValue, setEditValue] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery<AfiliadoStat[]>({
    queryKey: ["admin", "afiliados", "stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_afiliados_stats");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        commission_percent: Number(r.commission_percent),
        clicks: Number(r.clicks),
        signups: Number(r.signups),
        conversions: Number(r.conversions),
        revenue: Number(r.revenue),
        commission_due: Number(r.commission_due),
      }));
    },
  });

  const { data: detail } = useQuery<IndicacaoDetail[]>({
    queryKey: ["admin", "afiliado", "detail", detailId],
    enabled: !!detailId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("admin_afiliado_detail", {
        _afiliado_id: detailId,
      });
      if (error) throw error;
      return data || [];
    },
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await (supabase.from("afiliados" as any) as any)
        .update({ commission_percent: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comissão atualizada");
      qc.invalidateQueries({ queryKey: ["admin", "afiliados", "stats"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  const filtered = (stats || []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q)
    );
  });

  const totals = (stats || []).reduce(
    (acc, s) => ({
      afiliados: acc.afiliados + 1,
      clicks: acc.clicks + s.clicks,
      signups: acc.signups + s.signups,
      conversions: acc.conversions + s.conversions,
      revenue: acc.revenue + s.revenue,
      commission: acc.commission + s.commission_due,
    }),
    { afiliados: 0, clicks: 0, signups: 0, conversions: 0, revenue: 0, commission: 0 },
  );

  const buildLink = (code: string) => `${window.location.origin}/?ref=${code}`;

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(buildLink(code));
    toast.success("Link copiado");
  };

  const detailRow = stats?.find((s) => s.afiliado_id === detailId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Afiliados</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe cliques, cadastros, conversões e receita gerada
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard icon={Users} label="Afiliados" value={totals.afiliados.toString()} />
        <StatCard icon={MousePointerClick} label="Cliques" value={totals.clicks.toString()} />
        <StatCard icon={UserPlus} label="Cadastros" value={totals.signups.toString()} />
        <StatCard icon={CheckCircle2} label="Conversões" value={totals.conversions.toString()} />
        <StatCard icon={DollarSign} label="Receita" value={fmtBRL(totals.revenue)} />
        <StatCard icon={Wallet} label="Comissão devida" value={fmtBRL(totals.commission)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de afiliados</CardTitle>
          <Input
            placeholder="Buscar por nome, e-mail ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 max-w-sm"
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-muted-foreground p-4 text-sm">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">Nenhum afiliado encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Cadastros</TableHead>
                  <TableHead className="text-right">Conversões</TableHead>
                  <TableHead className="text-right">Conv. %</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const convRate = s.clicks > 0 ? ((s.conversions / s.clicks) * 100).toFixed(1) : "0";
                  return (
                    <TableRow key={s.afiliado_id}>
                      <TableCell>
                        <div className="font-medium">{s.name || "—"}</div>
                        <div className="text-muted-foreground text-xs">{s.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{s.code}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{s.clicks}</TableCell>
                      <TableCell className="text-right">{s.signups}</TableCell>
                      <TableCell className="text-right">{s.conversions}</TableCell>
                      <TableCell className="text-right">{convRate}%</TableCell>
                      <TableCell className="text-right">{fmtBRL(s.revenue)}</TableCell>
                      <TableCell className="text-right">
                        <div>{fmtBRL(s.commission_due)}</div>
                        <div className="text-muted-foreground text-xs">{s.commission_percent}%</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => copyLink(s.code)} title="Copiar link">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setEditValue(String(s.commission_percent)); }} title="Editar comissão">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDetailId(s.afiliado_id)} title="Detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editar comissão */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar comissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Comissão (%) de {editing?.name || editing?.email}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              disabled={updateCommission.isPending}
              onClick={() => {
                const v = parseFloat(editValue);
                if (isNaN(v) || v < 0 || v > 100) {
                  toast.error("Valor inválido");
                  return;
                }
                editing && updateCommission.mutate({ id: editing.afiliado_id, value: v });
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{detailRow?.name || detailRow?.email || "Afiliado"}</SheetTitle>
          </SheetHeader>

          {detailRow && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Cliques" value={detailRow.clicks} />
              <MiniStat label="Cadastros" value={detailRow.signups} />
              <MiniStat label="Conversões" value={detailRow.conversions} />
              <MiniStat label="Receita" value={fmtBRL(detailRow.revenue)} />
            </div>
          )}

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold">Indicados</h3>
            {!detail || detail.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum indicado ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.map((d) => (
                    <TableRow key={d.indicacao_id}>
                      <TableCell>
                        <div className="text-sm">{d.referred_name || "—"}</div>
                        <div className="text-muted-foreground text-xs">{d.referred_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.converted_at ? "default" : "secondary"}>
                          {d.converted_at ? "Convertido" : d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{d.plan || "—"}</TableCell>
                      <TableCell className="text-right">
                        {d.price ? fmtBRL(Number(d.price)) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="bg-primary/10 text-primary rounded-md p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-muted-foreground text-xs">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-muted rounded-md p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
