import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RotateCcw, Ban, UserX } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
}

interface Assinatura {
  id: string;
  plan: string;
  status: string;
  price: number | null;
  starts_at: string | null;
  expires_at: string | null;
}

export function ResetUserSubscriptionCard() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: results, isFetching } = useQuery<Profile[]>({
    queryKey: ["admin-reset-user-search", searchTerm],
    enabled: searchTerm.length >= 3,
    queryFn: async () => {
      const term = `%${searchTerm.toLowerCase()}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .or(`email.ilike.${term},name.ilike.${term}`)
        .limit(10);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const [selected, setSelected] = useState<Profile | null>(null);

  const { data: subs, isLoading: subsLoading } = useQuery<Assinatura[]>({
    queryKey: ["admin-reset-user-subs", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assinaturas")
        .select("id, plan, status, price, starts_at, expires_at")
        .eq("user_id", selected!.id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Assinatura[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-reset-user-subs", selected?.id] });
    queryClient.invalidateQueries({ queryKey: ["assinaturas"] });
    queryClient.invalidateQueries({ queryKey: ["admin-assinaturas"] });
  };

  const cancelAll = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { error } = await supabase
        .from("assinaturas")
        .update({ status: "cancelled", expires_at: new Date().toISOString() })
        .eq("user_id", selected.id)
        .eq("status", "active");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assinatura(s) ativa(s) cancelada(s)");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cancelar"),
  });

  const resetToTrial = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      // 1) cancelar todas as assinaturas ativas
      const { error: e1 } = await supabase
        .from("assinaturas")
        .update({ status: "cancelled", expires_at: new Date().toISOString() })
        .eq("user_id", selected.id)
        .eq("status", "active");
      if (e1) throw e1;
      // 2) zerar contador de demonstração
      const { error: e2 } = await (supabase.from("demo_play_log" as any) as any)
        .delete()
        .eq("user_id", selected.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Usuário resetado para o teste grátis");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao resetar"),
  });

  const deleteAll = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { error } = await supabase
        .from("assinaturas")
        .delete()
        .eq("user_id", selected.id);
      if (error) throw error;
      await (supabase.from("demo_play_log" as any) as any)
        .delete()
        .eq("user_id", selected.id);
    },
    onSuccess: () => {
      toast.success("Histórico de assinaturas removido");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
  });

  const activeSubs = (subs ?? []).filter((s) => s.status === "active");
  const hasActive = activeSubs.length > 0;
  const isBusy = cancelAll.isPending || resetToTrial.isPending || deleteAll.isPending;

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Resetar assinatura de usuário</h2>
        <p className="text-sm text-muted-foreground">
          Pesquise pelo e-mail ou nome, cancele a assinatura ativa ou devolva o usuário ao período de teste grátis.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearchTerm(query.trim());
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="E-mail ou nome (mín. 3 caracteres)"
          className="flex-1"
        />
        <Button type="submit" disabled={query.trim().length < 3} className="gap-2">
          <Search className="h-4 w-4" /> Buscar
        </Button>
      </form>

      {isFetching && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isFetching && searchTerm.length >= 3 && (results?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      )}

      {(results?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {results!.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelected(u)}
              className={`w-full text-left rounded-lg border p-3 text-sm transition-colors hover:bg-accent ${
                selected?.id === u.id ? "border-primary bg-accent" : "border-border bg-background"
              }`}
            >
              <div className="font-medium text-foreground">{u.name || "(sem nome)"}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold text-foreground">{selected.name || "(sem nome)"}</div>
            <div className="text-xs text-muted-foreground">{selected.email}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Assinaturas</div>
            {subsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (subs?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma assinatura registrada.</p>
            ) : (
              <ul className="space-y-1.5">
                {subs!.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 text-xs rounded-md bg-muted/40 px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {s.status}
                      </Badge>
                      <span className="font-medium uppercase">{s.plan}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {s.expires_at
                        ? `até ${new Date(s.expires_at).toLocaleDateString("pt-BR")}`
                        : "sem expiração"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={!hasActive || isBusy} className="gap-2">
                  <Ban className="h-4 w-4" /> Cancelar ativa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar assinatura ativa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A(s) assinatura(s) ativa(s) de <strong>{selected.email}</strong> serão marcadas como canceladas e expiradas agora. O histórico é preservado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancelAll.mutate()}>Cancelar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isBusy} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Voltar ao teste grátis
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar para o teste grátis?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cancela todas as assinaturas ativas de <strong>{selected.email}</strong> e zera o contador de músicas do modo demonstração.
                    <br /><br />
                    <strong>Importante:</strong> se o usuário foi cadastrado como trial (marca <code>trial_user</code>), ele continua podendo navegar com o limite de 5 plays e ser recuperado por e-mail. Caso contrário, será enviado para a tela de planos na próxima ação.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resetToTrial.mutate()}>Resetar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isBusy} className="gap-2">
                  <UserX className="h-4 w-4" /> Excluir histórico
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todo o histórico?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ação <strong>irreversível</strong>. Todas as assinaturas (ativas e antigas) de <strong>{selected.email}</strong> serão removidas do banco, junto com o contador de demonstração.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteAll.mutate()}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
