import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Plano {
  id: string;
  name: string;
  slug: string;
  price: number;
  duration_days: number | null;
  active: boolean;
  description: string | null;
}

const AdminPlanosPage = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Record<string, Partial<Plano>>>({});

  const { data: planos, isLoading } = useQuery<Plano[]>({
    queryKey: ["admin-planos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return data as Plano[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Plano> }) => {
      const { error } = await supabase.from("planos").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-planos"] });
      queryClient.invalidateQueries({ queryKey: ["planos"] });
      toast.success("Plano atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar plano"),
  });

  const getEdited = (plano: Plano) => ({ ...plano, ...editing[plano.id] });

  const handleChange = (id: string, field: string, value: any) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = (id: string) => {
    const updates = editing[id];
    if (!updates || Object.keys(updates).length === 0) return;
    updateMutation.mutate({ id, updates });
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleToggle = (id: string, active: boolean) => {
    updateMutation.mutate({ id, updates: { active } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planos</h1>
        <p className="text-muted-foreground">Gerencie os planos de assinatura.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Preço (R$)</TableHead>
                <TableHead>Duração (dias)</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planos?.map((plano) => {
                const edited = getEdited(plano);
                const hasChanges = !!editing[plano.id] && Object.keys(editing[plano.id]).length > 0;
                return (
                  <TableRow key={plano.id}>
                    <TableCell>
                      <Input
                        value={edited.name}
                        onChange={(e) => handleChange(plano.id, "name", e.target.value)}
                        className="h-8 w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{plano.slug}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={edited.price}
                        onChange={(e) => handleChange(plano.id, "price", parseFloat(e.target.value))}
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={edited.duration_days ?? ""}
                        placeholder="Vitalício"
                        onChange={(e) =>
                          handleChange(plano.id, "duration_days", e.target.value ? parseInt(e.target.value) : null)
                        }
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={edited.description ?? ""}
                        onChange={(e) => handleChange(plano.id, "description", e.target.value)}
                        className="h-8 w-48"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={plano.active}
                        onCheckedChange={(v) => handleToggle(plano.id, v)}
                      />
                    </TableCell>
                    <TableCell>
                      {hasChanges && (
                        <Button size="sm" onClick={() => handleSave(plano.id)} disabled={updateMutation.isPending}>
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminPlanosPage;
