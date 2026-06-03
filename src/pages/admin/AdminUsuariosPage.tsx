import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Disc, Trash2, Eye, Phone, CreditCard, Calendar, User } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useUser";
import { toast } from "sonner";

interface UserWithSub {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  cpf: string | null;
  has_discografias: boolean;
  created_at: string;
  assinaturas: { plan: string; status: string; expires_at?: string | null; created_at?: string }[];
  referred_by?: string | null;
}

const AdminUsuariosPage = () => {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserWithSub | null>(null);
  const [viewTarget, setViewTarget] = useState<UserWithSub | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      console.log("[AdminUsuarios:fetch]");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, whatsapp, cpf, has_discografias, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch subscriptions for all users
      const { data: subs } = await supabase
        .from("assinaturas")
        .select("user_id, plan, status, expires_at, created_at")
        .order("created_at", { ascending: false });

      // Fetch referral info for these users
      const { data: refs } = await supabase
        .from("indicacoes")
        .select(`
          referred_user_id,
          afiliados (
            profiles (
              email
            )
          )
        `);

      return (data ?? []).map((u) => {
        const userRef = (refs ?? []).find(r => r.referred_user_id === u.id);
        const referrerEmail = (userRef?.afiliados as any)?.profiles?.email;

        return {
          ...u,
          assinaturas: (subs ?? []).filter((s) => s.user_id === u.id),
          referred_by: referrerEmail
        };
      }) as UserWithSub[];
    },
  });

  const toggleDiscografiasMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ has_discografias: enabled })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Acesso atualizado com sucesso!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao atualizar acesso.");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { target_user_id: userId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário excluído com sucesso.");
      setDeleteTarget(null);
      setConfirmText("");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao excluir usuário.");
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
                    <TableHead>Email / WhatsApp</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Discografias</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Indicação de</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-foreground">{user.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{user.email}</span>
                          <span className="text-xs text-primary/70">{user.whatsapp || "Sem WhatsApp"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.assinaturas.filter(s => s.status === "active").length > 0 ? (
                          <Badge className="bg-primary/20 text-primary border-0">
                            {user.assinaturas.find(s => s.status === "active")?.plan}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={user.has_discografias || user.assinaturas.some(s => s.plan === "vitalicio")}
                            disabled={user.assinaturas.some(s => s.plan === "vitalicio") || toggleDiscografiasMutation.isPending}
                            onCheckedChange={(checked) => toggleDiscografiasMutation.mutate({ userId: user.id, enabled: checked })}
                          />
                          {user.assinaturas.some(s => s.plan === "vitalicio") && (
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Vitalício</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleString("pt-BR", { 
                          timeZone: "America/Sao_Paulo",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground italic">
                        {user.referred_by || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Ver detalhes"
                            onClick={() => setViewTarget(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={currentUser?.id === user.id}
                            title={currentUser?.id === user.id ? "Você não pode excluir sua própria conta" : "Excluir usuário"}
                            onClick={() => { setDeleteTarget(user); setConfirmText(""); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) { setDeleteTarget(null); setConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os dados de{" "}
              <strong>{deleteTarget?.name || deleteTarget?.email}</strong> ({deleteTarget?.email}) serão removidos: assinaturas, repertórios, favoritos, downloads, indicações e a conta de autenticação.
              <br /><br />
              Digite <strong>EXCLUIR</strong> para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="EXCLUIR"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "EXCLUIR" || deleteUserMutation.isPending}
              onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsuariosPage;
