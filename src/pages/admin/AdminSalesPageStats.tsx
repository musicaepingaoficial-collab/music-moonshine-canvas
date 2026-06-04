import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Eye, 
  Users, 
  ArrowLeft, 
  BarChart3, 
  Globe, 
  Smartphone, 
  Calendar as CalendarIcon,
  ChevronRight,
  Filter
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { useState } from "react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

export default function AdminSalesPageStats() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<number>(7); // days

  const { data: views, isLoading } = useQuery({
    queryKey: ["sales-page-views-full", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_page_views")
        .select("*")
        .gte("created_at", subDays(new Date(), dateRange).toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 1. Chart Data (Views by Day)
  const chartData = Array.from({ length: dateRange + 1 }).map((_, i) => {
    const date = subDays(new Date(), dateRange - i);
    const dateStr = format(date, "dd/MM");
    const count = views?.filter(v => 
      format(new Date(v.created_at), "dd/MM") === dateStr
    ).length || 0;
    return { name: dateStr, views: count };
  });

  // 2. Referrer Stats
  const referrers = views?.reduce((acc: any, v) => {
    let ref = "Direto / Outros";
    if (v.referrer) {
      try {
        const url = new URL(v.referrer);
        ref = url.hostname.replace("www.", "");
        if (ref.includes("instagram.com")) ref = "Instagram";
        if (ref.includes("facebook.com")) ref = "Facebook";
        if (ref.includes("google.com")) ref = "Google";
      } catch {
        ref = v.referrer;
      }
    }
    acc[ref] = (acc[ref] || 0) + 1;
    return acc;
  }, {});

  const referrerData = Object.entries(referrers || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5);

  // 3. Device Stats
  const devices = views?.reduce((acc: any, v) => {
    const ua = v.user_agent?.toLowerCase() || "";
    let device = "Desktop";
    if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) device = "Mobile";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});

  const deviceData = Object.entries(devices || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Análise de Vendas</h1>
            <p className="text-sm text-muted-foreground">Métricas detalhadas da página de vendas</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
          {[
            { label: "7d", val: 7 },
            { label: "15d", val: 15 },
            { label: "30d", val: 30 },
            { label: "90d", val: 90 },
          ].map((r) => (
            <button
              key={r.val}
              onClick={() => setDateRange(r.val)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateRange === r.val ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Visitas</p>
                <h3 className="text-3xl font-black tracking-tight">{views?.length || 0}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <Smartphone className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acesso Mobile</p>
                <h3 className="text-3xl font-black tracking-tight">
                  {Math.round(((devices?.["Mobile"] || 0) / (views?.length || 1)) * 100)}%
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl">
                <Globe className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Principal Origem</p>
                <h3 className="text-xl font-black tracking-tight truncate max-w-[150px]">
                  {referrerData[0]?.name || "N/A"}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Fluxo de Visitas</CardTitle>
            <CardDescription>Visualizações diárias nos últimos {dateRange} dias</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Origins Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Origem do Tráfego</CardTitle>
            <CardDescription>De onde vêm os seus potenciais clientes</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={referrerData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {referrerData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Dispositivos</CardTitle>
            <CardDescription>Distribuição por tipo de aparelho</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {deviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Visits Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Últimos Acessos</CardTitle>
            <CardDescription>Log detalhado de acessos recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-3 font-medium">Data/Hora</th>
                    <th className="pb-3 font-medium">Origem</th>
                    <th className="pb-3 font-medium">Dispositivo</th>
                    <th className="pb-3 font-medium">Usuário</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {views?.slice(-10).reverse().map((v) => (
                    <tr key={v.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3 text-xs font-medium">
                        {format(new Date(v.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-[10px] truncate max-w-[150px]">
                          {v.referrer || "Direto"}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {v.user_agent}
                      </td>
                      <td className="py-3 text-xs">
                        {v.user_id ? <Badge className="bg-emerald-500/10 text-emerald-500 border-none">Logado</Badge> : <span className="text-muted-foreground">Visitante</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
