import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Music, DollarSign, TrendingUp, Loader2, Activity, AlertTriangle, Eye, MousePointer2, HardDrive } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminStats } from "@/hooks/useAdminStats";
import { StatCardSkeleton } from "@/components/ui/Skeletons";
import { ErrorState } from "@/components/ui/ErrorState";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const AdminDashboardPage = () => {
  const { data: stats, isLoading, error, refetch } = useAdminStats();
  const [timeRange, setTimeRange] = useState<"day" | "week">("day");
  const [salesTimeRange, setSalesTimeRange] = useState<"day" | "week" | "month">("day");

  const { data: salesStats } = useQuery({
    queryKey: ["sales-page-stats", salesTimeRange],
    queryFn: async () => {
      const startTime = new Date();
      if (salesTimeRange === "day") {
        startTime.setHours(0, 0, 0, 0);
      } else if (salesTimeRange === "week") {
        startTime.setDate(startTime.getDate() - 7);
      } else {
        startTime.setMonth(startTime.getMonth() - 1);
      }

      const { count, error } = await supabase
        .from("sales_page_views" as any)
        .select("*", { count: 'exact', head: true })
        .gte("created_at", startTime.toISOString());

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });
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
    refetchInterval: 30000,
  });

  const { data: usageMetrics } = useQuery({
    queryKey: ["usage-metrics", timeRange],
    queryFn: async () => {
      const now = new Date();
      const startTime = new Date();
      
      if (timeRange === "day") {
        startTime.setHours(startTime.getHours() - 24);
      } else {
        startTime.setDate(startTime.getDate() - 7);
      }

      const { data, error } = await supabase
        .from("usage_metrics")
        .select("*")
        .gte("timestamp", startTime.toISOString())
        .order("timestamp", { ascending: true });

      if (error) throw error;

      if (timeRange === "day") {
        // Group by hour for the day view to keep the chart clean
        const hourlyData: Record<string, { count: number, total: number }> = {};
        data.forEach(m => {
          const date = new Date(m.timestamp);
          const hourKey = date.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }).split(':')[0] + ':00';
          if (!hourlyData[hourKey]) {
            hourlyData[hourKey] = { count: 0, total: 0 };
          }
          hourlyData[hourKey].total += m.online_count;
          hourlyData[hourKey].count += 1;
        });

        return Object.entries(hourlyData).map(([time, stats]) => ({
          time,
          count: Math.round(stats.total / stats.count)
        }));
      } else {
        // Group by day for the week view
        const dailyData: Record<string, { count: number, total: number }> = {};
        data.forEach(m => {
          const date = new Date(m.timestamp);
          const dayKey = date.toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit' });
          if (!dailyData[dayKey]) {
            dailyData[dayKey] = { count: 0, total: 0 };
          }
          dailyData[dayKey].total += m.online_count;
          dailyData[dayKey].count += 1;
        });

        return Object.entries(dailyData).map(([time, stats]) => ({
          time,
          count: Math.round(stats.total / stats.count)
        }));
      }
    },
    refetchInterval: timeRange === "day" ? 60000 : 300000,
  });

  const isNearLimit = (onlineUsers?.length || 0) >= 40;

  const statCards = stats
    ? [
        { 
          label: "Usuários Totais", 
          value: stats.totalUsers.toLocaleString("pt-BR"), 
          icon: Users, 
          color: "text-blue-500",
          bgColor: "bg-blue-500/10"
        },
        { 
          label: "Assinantes Ativos", 
          value: stats.activeSubscriptions.toLocaleString("pt-BR"), 
          icon: TrendingUp, 
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10"
        },
        { 
          label: "Online Agora", 
          value: String(onlineUsers?.length || 0), 
          icon: Activity, 
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
          badge: "Tempo Real"
        },
        { 
          label: "Visitas Vendas", 
          value: salesStats?.toLocaleString("pt-BR") || "0", 
          icon: Eye, 
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
          controls: true
        },
      ]
    : [];

  const secondaryStats = stats ? [
    { label: "Músicas", value: stats.totalMusicas.toLocaleString("pt-BR"), icon: Music },
    { label: "Drives Ativos", value: String(stats.drives.filter(d => d.status === 'online').length), icon: HardDrive },
  ] : [];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitoramento geral da plataforma em tempo real</p>
        </div>
        
        {isNearLimit && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-xl animate-pulse"
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Alerta de Tráfego</span>
          </motion.div>
        )}
      </div>

      {error && <ErrorState message="Erro ao carregar estatísticas." onRetry={() => refetch()} />}

      {/* Main Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${stat.bgColor || 'bg-muted'}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color || 'text-muted-foreground'}`} />
                  </div>
                  {stat.badge && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-wider">
                      {stat.badge}
                    </Badge>
                  )}
                  {stat.controls && (
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                      {['day', 'week', 'month'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setSalesTimeRange(range as any)}
                          className={`text-[9px] px-2 py-1 rounded-md font-bold uppercase transition-all ${
                            salesTimeRange === range 
                              ? "bg-card text-foreground shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {range === 'day' ? 'Dia' : range === 'week' ? 'Sem' : 'Mês'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
                  <p className="text-3xl font-black text-foreground mt-1 tracking-tight">
                    {stat.value}
                  </p>
                </div>
                
                {/* Decorative background element */}
                <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity`}>
                   <stat.icon size={100} />
                </div>
              </motion.div>
            ))}
      </div>

      {/* Secondary Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {secondaryStats.map((stat, i) => (
           <div key={i} className="bg-muted/30 border border-border/40 rounded-xl px-4 py-3 flex items-center gap-3">
             <stat.icon className="h-4 w-4 text-muted-foreground" />
             <div className="flex flex-col">
               <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
               <span className="text-sm font-bold">{stat.value}</span>
             </div>
           </div>
         ))}
      </div>

      {!isLoading && stats && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Registrations */}
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/10">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Últimos Cadastros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4">
              <div className="space-y-2">
                {stats.recentUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center bg-muted/20 rounded-xl border border-dashed">Nenhum usuário recente.</p>
                ) : (
                  stats.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate block">{user.name || "Sem Nome"}</span>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-medium border-border/50">
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Online Users List */}
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/10">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Sessões Ativas
              </CardTitle>
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-none animate-pulse">
                AO VIVO
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 px-4">
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                {!onlineUsers || onlineUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center bg-muted/20 rounded-xl border border-dashed">Ninguém online no momento.</p>
                ) : (
                  onlineUsers.map((u: any) => (
                    <div key={u.user_id} className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-foreground truncate block">
                          {(u.profiles as any)?.name || (u.profiles as any)?.email || "Usuário Anônimo"}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                           <MousePointer2 className="h-3 w-3" />
                           <span className="truncate">{u.path || '/'}</span>
                           <span>•</span>
                           <span>{new Date(u.last_seen_at).toLocaleTimeString("pt-BR")}</span>
                        </div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] ml-4" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Infrastructure Health */}
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/10">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-slate-500" />
                Status da Infraestrutura
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-4">
              <div className="space-y-3">
                {stats.drives.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center bg-muted/20 rounded-xl border border-dashed">Nenhum drive monitorado.</p>
                ) : (
                  stats.drives.map((drive) => (
                    <div key={drive.name} className="flex flex-col gap-2 rounded-xl bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">{drive.name}</span>
                        <Badge 
                          className={drive.status === "online" 
                            ? "bg-emerald-500/10 text-emerald-500 border-none font-bold" 
                            : "bg-destructive/10 text-destructive border-none font-bold"}
                        >
                          {drive.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="w-full bg-background/50 rounded-full h-2 overflow-hidden border border-border/10">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            drive.usage_percent > 90 ? 'bg-destructive' : drive.usage_percent > 70 ? 'bg-orange-500' : 'bg-primary'
                          }`}
                          style={{ width: `${drive.usage_percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                        <span>Espaço Utilizado</span>
                        <span>{drive.usage_percent}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Popular Content */}
          {stats.popularTracks.length > 0 && (
            <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden lg:col-span-1">
              <CardHeader className="pb-2 border-b border-border/10">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Music className="h-5 w-5 text-pink-500" />
                  Músicas em Destaque
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4">
                <div className="space-y-2">
                  {stats.popularTracks.map((track, i) => (
                    <div key={track.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-pink-500">{i + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{track.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate uppercase font-medium">{track.artist}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-foreground">{track.download_count}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Downloads</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Usage Graph Section */}
      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
        <CardHeader className="pb-2 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/10">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black flex items-center gap-2 tracking-tight">
              <Activity className="h-6 w-6 text-primary" />
              Volume de Tráfego
            </CardTitle>
            <p className="text-xs text-muted-foreground font-medium">Histórico detalhado de usuários simultâneos</p>
          </div>
          <Tabs 
            defaultValue="day" 
            className="w-full sm:w-[200px]" 
            onValueChange={(v) => setTimeRange(v as "day" | "week")}
          >
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
              <TabsTrigger value="day" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-sm">Dia</TabsTrigger>
              <TabsTrigger value="week" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:shadow-sm">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="h-[300px] sm:h-[400px] w-full pt-8 pb-4 px-2 sm:px-6">
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
  );
};

export default AdminDashboardPage;
