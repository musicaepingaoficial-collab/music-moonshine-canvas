import { Users, Music, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useAdminStats";
import { StatCardSkeleton } from "@/components/ui/Skeletons";
import { ErrorState } from "@/components/ui/ErrorState";

const AdminDashboardPage = () => {
  const { data: stats, isLoading, error, refetch } = useAdminStats();

  console.log("[AdminDashboard:render]", { isLoading, hasError: !!error });

  const statCards = stats
    ? [
        { label: "Usuários", value: stats.totalUsers.toLocaleString("pt-BR"), icon: Users, change: "" },
        { label: "Músicas", value: stats.totalMusicas.toLocaleString("pt-BR"), icon: Music, change: "" },
        { label: "Receita mensal", value: `R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, change: "" },
        { label: "Assinantes ativos", value: stats.activeSubscriptions.toLocaleString("pt-BR"), icon: TrendingUp, change: "" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-sm text-muted-foreground">Visão geral da plataforma</p>
      </div>

      {error && <ErrorState message="Erro ao carregar estatísticas." onRetry={() => refetch()} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
      </div>

      {!isLoading && stats && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Últimos cadastros</h2>
            <div className="space-y-3">
              {stats.recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário cadastrado.</p>
              ) : (
                stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                    <div>
                      <span className="text-sm text-foreground">{user.name || user.email}</span>
                      {user.name && <p className="text-xs text-muted-foreground">{user.email}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Status dos Drives</h2>
            <div className="space-y-3">
              {stats.drives.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum drive configurado.</p>
              ) : (
                stats.drives.map((drive) => (
                  <div key={drive.name} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                    <span className="text-sm text-foreground">{drive.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{drive.usage_percent}%</span>
                      <span className={`text-xs font-medium ${drive.status === "online" ? "text-primary" : "text-destructive"}`}>
                        {drive.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {stats.popularTracks.length > 0 && (
            <div className="rounded-xl bg-card p-6 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Músicas mais baixadas</h2>
              <div className="space-y-3">
                {stats.popularTracks.map((track, i) => (
                  <div key={track.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                      <div>
                        <p className="text-sm text-foreground">{track.title}</p>
                        <p className="text-xs text-muted-foreground">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{track.download_count} downloads</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
