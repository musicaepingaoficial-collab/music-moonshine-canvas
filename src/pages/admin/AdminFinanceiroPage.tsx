import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const AdminFinanceiroPage = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-financeiro"],
    queryFn: async () => {
      console.log("[AdminFinanceiro:fetch]");
      const [
        { data: allSubs },
        { data: affiliates },
        { data: referrals },
      ] = await Promise.all([
        supabase.from("assinaturas").select("id, user_id, plan, status, price, created_at"),
        supabase.from("afiliados").select("id, user_id, code, commission_percent, created_at"),
        supabase.from("indicacoes").select("id, afiliado_id, status, created_at"),
      ]);

      const activeSubs = (allSubs ?? []).filter((s) => s.status === "active");
      const totalRevenue = activeSubs.reduce((sum, s) => sum + Number(s.price || 0), 0);
      const avgTicket = activeSubs.length > 0 ? totalRevenue / activeSubs.length : 0;

      // Monthly breakdown (last 6 months)
      const now = new Date();
      const monthly: { month: string; revenue: number; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        const monthSubs = (allSubs ?? []).filter((s) => {
          const sd = new Date(s.created_at);
          return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        });
        monthly.push({
          month: label,
          revenue: monthSubs.reduce((sum, s) => sum + Number(s.price || 0), 0),
          count: monthSubs.length,
        });
      }

      return {
        totalRevenue,
        activeCount: activeSubs.length,
        avgTicket,
        totalAffiliates: (affiliates ?? []).length,
        totalReferrals: (referrals ?? []).filter((r) => r.status === "confirmed").length,
        monthly,
        recentSubs: (allSubs ?? []).slice(0, 10),
      };
    },
  });

  console.log("[AdminFinanceiro:render]", { isLoading, hasError: !!error });

  const statCards = data
    ? [
        { label: "Receita total", value: `R$ ${data.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign },
        { label: "Assinantes ativos", value: data.activeCount.toString(), icon: Users },
        { label: "Ticket médio", value: `R$ ${data.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingUp },
        { label: "Afiliados", value: data.totalAffiliates.toString(), icon: CreditCard },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Visão geral de receita e assinaturas</p>
      </div>

      {error && <ErrorState message="Erro ao carregar dados financeiros." onRetry={() => refetch()} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-0">
                  <CardContent className="pt-5 pb-5">
                    <stat.icon className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      {!isLoading && data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly breakdown */}
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="text-lg">Receita mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.monthly.map((m) => (
                  <div key={m.month} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                    <span className="text-sm text-foreground capitalize">{m.month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">{m.count} assinaturas</span>
                      <span className="text-sm font-medium text-primary">
                        R$ {m.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent subs */}
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="text-lg">Últimas assinaturas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSubs.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="text-foreground">{sub.plan}</TableCell>
                      <TableCell>
                        <Badge
                          className={`border-0 ${
                            sub.status === "active"
                              ? "bg-primary/20 text-primary"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        R$ {Number(sub.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminFinanceiroPage;
