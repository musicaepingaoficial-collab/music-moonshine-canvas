import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  active: "bg-primary/20 text-primary",
  expired: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const AdminAssinaturasPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [planSlug, setPlanSlug] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [price, setPrice] = useState<string>("0");
  const [durationDays, setDurationDays] = useState<string>("30");
  const [lifetime, setLifetime] = useState(false);

  const { data: subs, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assinaturas")
        .select("id, user_id, plan, status, price, starts_at, expires_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return (data ?? []).map((s) => ({
        ...s,
        profile: profileMap.get(s.user_id),
      }));
    },
  });

  const { data: planos } = useQuery({
    queryKey: ["admin-planos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos")
        .select("id, name, slug, price, duration_days, active")
        .eq("active", true)
        .order("price");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-search", userSearch],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, name, email").limit(20);
      if (userSearch.trim()) {
        q = q.or(`name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const selectedUser = useMemo(
    () => profiles?.find((p) => p.id === selectedUserId),
    [profiles, selectedUserId]
  );

  const handlePlanChange = (slug: string) => {
    setPlanSlug(slug);
    const p = planos?.find((pl) => pl.slug === slug);
    if (p) {
      setPrice(String(p.price ?? 0));
      if (p.duration_days) {
        setDurationDays(String(p.duration_days));
        setLifetime(false);
      } else {
        setLifetime(true);
      }
    }
  };

  const resetForm = () => {
    setUserSearch("");
    setSelectedUserId("");
    setPlanSlug("");
    setStatus("active");
    setPrice("0");
    setDurationDays("30");
    setLifetime(false);
  };

  const createSub = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("Selecione um usuário");
      if (!planSlug) throw new Error("Selecione um plano");

      const startsAt = new Date();
      const expiresAt = lifetime
        ? null
        : new Date(startsAt.getTime() + Number(durationDays) * 86400000).toISOString();

      const { error } = await supabase.from("assinaturas").insert({
        user_id: selectedUserId,
        plan: planSlug,
        status,
        price: Number(price) || 0,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plano adicionado", description: "Assinatura criada com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const totalRevenue = (subs ?? [])
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + Number(s.price || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Gerencie as assinaturas dos usuários</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card p-4 text-right">
            <p className="text-xs text-muted-foreground">Receita ativa</p>
            <p className="text-xl font-bold text-primary">
              R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Adicionar plano
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar plano manualmente</DialogTitle>
                <DialogDescription>
                  Atribua um plano diretamente a um usuário existente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buscar usuário</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Nome ou email"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {profiles && profiles.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                      {profiles.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedUserId(p.id)}
                          className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                            selectedUserId === p.id ? "bg-accent" : ""
                          }`}
                        >
                          <span className="font-medium text-foreground">{p.name || "—"}</span>
                          <span className="text-xs text-muted-foreground">{p.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedUser && (
                    <p className="text-xs text-primary">
                      Selecionado: {selectedUser.name || selectedUser.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select value={planSlug} onValueChange={handlePlanChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {(planos ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.slug}>
                          {p.name} — R$ {Number(p.price).toFixed(2)}
                        </SelectItem>
                      ))}
                      <SelectItem value="vitalicio">Vitalício (customizado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="expired">Expirada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Duração (dias)</Label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={lifetime}
                        onChange={(e) => setLifetime(e.target.checked)}
                      />
                      Vitalício (sem expiração)
                    </label>
                  </div>
                  <Input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    disabled={lifetime}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => createSub.mutate()}
                  disabled={createSub.isPending || !selectedUserId || !planSlug}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {createSub.isPending ? "Salvando..." : "Adicionar plano"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && <ErrorState message="Erro ao carregar assinaturas." onRetry={() => refetch()} />}

      <Card className="border-0">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (subs ?? []).length === 0 ? (
            <EmptyState icon={CreditCard} title="Nenhuma assinatura" description="Ainda não há assinaturas registradas." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Expiração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(subs ?? []).map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <span className="text-foreground">{sub.profile?.name || sub.profile?.email || "—"}</span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{sub.plan}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 ${statusColors[sub.status] || "bg-muted text-muted-foreground"}`}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        R$ {Number(sub.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sub.starts_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAssinaturasPage;
