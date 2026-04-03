import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard } from "lucide-react";

const statusColors: Record<string, string> = {
  active: "bg-primary/20 text-primary",
  expired: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const AdminAssinaturasPage = () => {
  const { data: subs, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      console.log("[AdminAssinaturas:fetch]");
      const { data, error } = await supabase
        .from("assinaturas")
        .select("id, user_id, plan, status, price, starts_at, expires_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get profile names
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

  console.log("[AdminAssinaturas:render]", { total: subs?.length });

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
        <div className="rounded-xl bg-card p-4 text-right">
          <p className="text-xs text-muted-foreground">Receita ativa</p>
          <p className="text-xl font-bold text-primary">
            R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
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
