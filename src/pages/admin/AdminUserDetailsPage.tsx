import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, User, Phone, CreditCard, Calendar, Disc, Mail, UserCheck, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ErrorState } from "@/components/ui/ErrorState";
import { toast } from "sonner";

const AdminUserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const toggleDiscografiasMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      console.log(`[AdminUserDetails] Toggling discografias for ${userId} to ${enabled}`);
      const { error } = await supabase
        .from("profiles")
        .update({ has_discografias: enabled })
        .eq("id", userId);
      if (error) throw error;
      return { enabled, userId };
    },
    onSuccess: (data) => {
      console.log(`[AdminUserDetails] Successfully toggled discografias for ${data.userId}`);
      queryClient.invalidateQueries({ queryKey: ["admin-user-details", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(data.enabled ? "Módulo Discografia ativado!" : "Módulo Discografia desativado!");
    },
    onError: (error: any) => {
      console.error("[AdminUserDetails] Error toggling discografias:", error);
      toast.error(error.message || "Erro ao atualizar acesso.");
    },
  });

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["admin-user-details", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      
      if (profileErr) throw profileErr;

      const { data: assinaturas } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      const { data: indicacoes } = await supabase
        .from("indicacoes")
        .select(`
          referred_user_id,
          afiliados (
            profiles (
              email
            )
          )
        `)
        .eq("referred_user_id", id)
        .maybeSingle();

      return {
        ...profile,
        assinaturas: assinaturas || [],
        referred_by: (indicacoes?.afiliados as any)?.profiles?.email
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return <ErrorState message="Usuário não encontrado." onRetry={() => navigate(-1)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Detalhes do Usuário</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <User className="h-10 w-10" />
            </div>
            <CardTitle className="text-center">{user.name || "Sem Nome"}</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{user.whatsapp || "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>{user.cpf || "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Cadastrado em {new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span>Indicado por: {user.referred_by || "Direto"}</span>
            </div>
            <div className="pt-2">
              <Button 
                className="w-full gap-2" 
                variant="outline"
                onClick={() => {
                  const phone = user.whatsapp?.replace(/\D/g, "");
                  if (!phone) return toast.error("Usuário sem WhatsApp");
                  window.open(`https://wa.me/55${phone}`, "_blank");
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Conversar no WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Histórico de Assinaturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user.assinaturas.length > 0 ? (
                  user.assinaturas.map((sub: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30">
                      <div>
                        <p className="font-bold uppercase text-sm">{sub.plan}</p>
                        <p className="text-xs text-muted-foreground">
                          Desde {new Date(sub.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge className={sub.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}>
                        {sub.status === "active" ? "Ativa" : sub.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma assinatura registrada.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Disc className="h-5 w-5 text-primary" />
                Permissões Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-secondary/30">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold">Módulo Discografias</span>
                  <p className="text-xs text-muted-foreground">Ativar/desativar acesso manual</p>
                </div>
                <Switch 
                  checked={user.has_discografias || user.assinaturas.some((s: any) => s.status === "active" && (s.plan === "vitalicio" || s.plan === "anual"))}
                  disabled={user.assinaturas.some((s: any) => s.status === "active" && (s.plan === "vitalicio" || s.plan === "anual")) || toggleDiscografiasMutation.isPending}
                  onCheckedChange={(checked) => toggleDiscografiasMutation.mutate({ userId: user.id, enabled: checked })}
                />
              </div>
              {user.assinaturas.some((s: any) => s.status === "active" && (s.plan === "vitalicio" || s.plan === "anual")) && (
                <p className="text-[10px] text-primary mt-2 italic px-1">
                  * Acesso liberado automaticamente pelo plano atual.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetailsPage;
