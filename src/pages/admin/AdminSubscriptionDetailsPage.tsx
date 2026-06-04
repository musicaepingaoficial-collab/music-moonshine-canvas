import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, CreditCard, User, Mail, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ErrorState } from "@/components/ui/ErrorState";

const AdminSubscriptionDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ["admin-subscription-details", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("assinaturas")
        .select(`
          *,
          profiles (
            name,
            email,
            whatsapp
          )
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !subscription) {
    return <ErrorState message="Assinatura não encontrada." onRetry={() => navigate(-1)} />;
  }

  const profile = subscription.profiles as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Detalhes da Assinatura</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">{profile?.name || "Sem nome"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">E-mail</p>
              <p className="text-sm font-medium">{profile?.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">WhatsApp</p>
              <p className="text-sm font-medium">{profile?.whatsapp || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Dados do Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Plano</p>
                <p className="text-lg font-black uppercase text-primary">{subscription.plan}</p>
              </div>
              <Badge className={subscription.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}>
                {subscription.status === "active" ? "Ativa" : subscription.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Valor
                </p>
                <p className="text-sm font-medium">R$ {Number(subscription.price || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Início
                </p>
                <p className="text-sm font-medium">{new Date(subscription.starts_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Expiração
                </p>
                <p className="text-sm font-medium">
                  {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString("pt-BR") : "Vitalício"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSubscriptionDetailsPage;
