import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HardDrive, Plus, Pencil, Trash2, RefreshCw, HelpCircle, Key, Users, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface DriveForm {
  name: string;
  drive_id: string;
}

const AdminDrivesPage = () => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<DriveForm>({ name: "", drive_id: "" });

  const { data: drives, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-drives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_drives")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (f: DriveForm) => {
      const { error } = await supabase.from("google_drives").insert({ name: f.name.trim(), drive_id: f.drive_id.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drives"] });
      toast.success("Drive adicionado!");
      setAddOpen(false);
      setForm({ name: "", drive_id: "" });
    },
    onError: () => toast.error("Erro ao adicionar drive."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("google_drives").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drives"] });
      toast.success("Drive atualizado!");
      setEditId(null);
    },
    onError: () => toast.error("Erro ao atualizar drive."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("google_drives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drives"] });
      toast.success("Drive removido!");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao remover drive."),
  });

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const syncMutation = useMutation({
    mutationFn: async (drive: { id: string; drive_id: string }) => {
      setSyncingId(drive.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-drive`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ driveId: drive.drive_id, googleDriveTableId: drive.id }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro na sincronização");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-drives"] });
      queryClient.invalidateQueries({ queryKey: ["musicas"] });
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      setSyncingId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao sincronizar drive.");
      setSyncingId(null);
    },
  });

  const editDrive = drives?.find((d) => d.id === editId);

  const openEdit = (drive: typeof drives extends (infer T)[] ? T : never) => {
    setForm({ name: drive.name, drive_id: drive.drive_id });
    setEditId(drive.id);
  };

  const toggleStatus = (drive: { id: string; status: string }) => {
    updateMutation.mutate({ id: drive.id, updates: { status: drive.status === "online" ? "offline" : "online" } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Google Drives</h1>
          <p className="text-sm text-muted-foreground">Monitore e gerencie os drives conectados</p>
        </div>
        <Button onClick={() => { setForm({ name: "", drive_id: "" }); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Drive
        </Button>
      </div>

      {error && <ErrorState message="Erro ao carregar drives." onRetry={() => refetch()} />}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : (drives ?? []).length === 0 ? (
        <EmptyState icon={HardDrive} title="Nenhum drive conectado" description="Adicione um Google Drive para começar." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drives!.map((drive, i) => {
            const usage = drive.usage_percent ?? 0;
            const isWarning = usage > 80;
            const isCritical = usage > 95;

            return (
              <motion.div key={drive.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="border-0">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <HardDrive className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{drive.name}</span>
                      </div>
                      <Badge
                        className={`border-0 cursor-pointer ${drive.status === "online" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}
                        onClick={() => toggleStatus(drive)}
                      >
                        {drive.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Uso</span>
                        <span className={isCritical ? "text-destructive font-bold" : isWarning ? "text-yellow-500 font-medium" : "text-foreground"}>
                          {usage}%
                        </span>
                      </div>
                      <Progress value={usage} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate max-w-[40%]">ID: {drive.drive_id}</p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary"
                          onClick={() => syncMutation.mutate(drive)}
                          disabled={syncingId === drive.id}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${syncingId === drive.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(drive)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(drive.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Google Drive</DialogTitle>
            <DialogDescription>Insira o nome e o ID do drive compartilhado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Drive Principal" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Drive ID</Label>
              <Input placeholder="ID do Google Drive" value={form.drive_id} onChange={(e) => setForm((p) => ({ ...p, drive_id: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMutation.mutate(form)} disabled={!form.name.trim() || !form.drive_id.trim() || addMutation.isPending}>
              {addMutation.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Drive</DialogTitle>
            <DialogDescription>Altere o nome ou o ID do drive.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Drive ID</Label>
              <Input value={form.drive_id} onChange={(e) => setForm((p) => ({ ...p, drive_id: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancelar</Button>
            <Button
              onClick={() => editId && updateMutation.mutate({ id: editId, updates: { name: form.name.trim(), drive_id: form.drive_id.trim() } })}
              disabled={!form.name.trim() || !form.drive_id.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover drive?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Músicas vinculadas a este drive podem ficar inacessíveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDrivesPage;
