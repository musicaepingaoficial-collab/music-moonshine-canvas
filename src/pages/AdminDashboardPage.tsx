import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Music, DollarSign, TrendingUp, Loader2, Activity, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useAdminStats";
import { StatCardSkeleton } from "@/components/ui/Skeletons";
import { ErrorState } from "@/components/ui/ErrorState";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AdminDashboardPage = () => {
  const { data: stats, isLoading, error, refetch } = useAdminStats();
  const { data: onlineUsers, isLoading: loadingOnline } = useQuery({
    queryKey: ["online-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("online_users")
        .select(`
          *,
          profiles (
            name,
            email
          )
        `)
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Update every 30s
  });

  console.log("[AdminDashboard:render]", { isLoading, hasError: !!error });

  const statCards = stats
    ? [
        { label: "Usuários", value: stats.totalUsers.toLocaleString("pt-BR"), icon: Users, change: "" },
        { label: "Online Agora", value: String(onlineUsers?.length || 0), icon: Activity, change: "Em tempo real" },
        { label: "Músicas", value: stats.totalMusicas.toLocaleString("pt-BR"), icon: Music, change: "" },
        { label: "Assinantes ativos", value: stats.activeSubscriptions.toLocaleString("pt-BR"), icon: TrendingUp, change: "" },
      ]
    : [];

  const { data: usageMetrics } = useQuery({
    queryKey: ["usage-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_metrics")
        .select("*")
        .order("timestamp", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data.map(m => ({
        time: new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
        count: m.online_count
      }));
    },
    refetchInterval: 60000,
  });

  const isNearLimit = (onlineUsers?.length || 0) >= 40;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Visão geral da plataforma</p>
        </div>
        {isNearLimit && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg animate-pulse"
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-bold">ALERTA: PICO DE ACESSOS ({onlineUsers?.length})</span>
          </motion.div>
        )}
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
            <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Usuários Online (Tempo Real)
            </h2>
            <div className="space-y-3">
              {!onlineUsers || onlineUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Ninguém online no momento.</p>
              ) : (
                onlineUsers.map((u: any) => (
                  <div key={u.user_id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                    <div className="min-w-0 flex-1 pr-4">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {(u.profiles as any)?.name || (u.profiles as any)?.email || "Anônimo"}
                      </span>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {u.path} • {new Date(u.last_seen_at).toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
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

      {/* Usage Graph */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Picos de Acessos Simultâneos
          </CardTitle>
          <p className="text-xs text-muted-foreground">Monitoramento histórico de carga no servidor de arquivos</p>
        </CardHeader>
        <CardContent className="h-[300px] w-full pt-4">
          {usageMetrics && usageMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageMetrics}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  domain={[0, 60]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Usuários"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center border-2 border-dashed rounded-xl border-muted">
              <p className="text-sm text-muted-foreground">Coletando dados iniciais...</p>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
