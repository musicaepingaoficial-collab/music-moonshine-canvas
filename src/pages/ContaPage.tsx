import { Banner } from "@/components/ui/Banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth, useProfile, useAssinatura, useIsAdmin } from "@/hooks/useUser";
import { StatCardSkeleton } from "@/components/ui/Skeletons";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ContaPage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading: loadingProfile, error: errorProfile, refetch: refetchProfile } = useProfile(user?.id);
  const { data: assinatura, isLoading: loadingSub } = useAssinatura(user?.id);
  const { data: isAdmin } = useIsAdmin(user?.id);
  const navigate = useNavigate();

  const isLoading = loadingProfile || loadingSub;

  console.log("[Conta:render]", { profile: profile?.email, isLoading });

  if (errorProfile) {
    return (
      <div className="space-y-8">
        <Banner title="Minha Conta" subtitle="Gerencie seus dados e assinatura." gradient={false} />
        <ErrorState message="Erro ao carregar dados da conta." onRetry={() => refetchProfile()} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Banner title="Minha Conta" subtitle="Gerencie seus dados e assinatura." gradient={false} />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-16" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Perfil</h2>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/20 text-xl text-primary">
                  {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{profile?.name || "Usuário"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email || "—"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground" htmlFor="name-input">Nome</label>
                <Input id="name-input" defaultValue={profile?.name || ""} className="bg-secondary border-border/50" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground" htmlFor="email-input">Email</label>
                <Input id="email-input" defaultValue={profile?.email || ""} className="bg-secondary border-border/50" />
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Salvar alterações
              </Button>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Assinatura</h2>
            {assinatura ? (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    {assinatura.plan}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{assinatura.status}</span>
                </div>
                {assinatura.expires_at && (
                  <p className="text-sm text-muted-foreground mb-1">
                    Expira em: {new Date(assinatura.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
                <p className="text-2xl font-bold text-foreground mb-4">
                  R$ {Number(assinatura.price).toFixed(2).replace(".", ",")}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
              </>
            ) : (
              <div className="mb-4">
                <Badge variant="secondary" className="bg-muted text-muted-foreground">Free</Badge>
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
              </div>
            )}
            <Button variant="outline" className="border-border/50 text-foreground hover:bg-accent">
              Gerenciar assinatura
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContaPage;
