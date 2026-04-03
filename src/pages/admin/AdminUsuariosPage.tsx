import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";

interface UserWithSub {
  id: string;
  name: string;
  email: string;
  created_at: string;
  assinaturas: { plan: string; status: string }[];
}

const AdminUsuariosPage = () => {
  const [search, setSearch] = useState("");

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      console.log("[AdminUsuarios:fetch]");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch subscriptions for all users
      const { data: subs } = await supabase
        .from("assinaturas")
        .select("user_id, plan, status")
        .eq("status", "active");

      return (data ?? []).map((u) => ({
        ...u,
        assinaturas: (subs ?? []).filter((s) => s.user_id === u.id),
      })) as UserWithSub[];
    },
  });

  const filtered = (users ?? []).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  console.log("[AdminUsuarios:render]", { total: users?.length, filtered: filtered.length });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie os usuários da plataforma</p>
      </div>

      {error && <ErrorState message="Erro ao carregar usuários." onRetry={() => refetch()} />}

      <Card className="border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Buscar usuários"
              />
            </div>
            <Badge variant="secondary" className="whitespace-nowrap">
              {filtered.length} usuário{filtered.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Tente alterar os termos da busca." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-foreground">{user.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {user.assinaturas.length > 0 ? (
                          <Badge className="bg-primary/20 text-primary border-0">{user.assinaturas[0].plan}</Badge>
                        ) : (
                          <Badge variant="secondary">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
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

export default AdminUsuariosPage;
