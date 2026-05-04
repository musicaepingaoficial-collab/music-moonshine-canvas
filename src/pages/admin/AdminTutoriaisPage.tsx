import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Tutorial {
  id: string;
  titulo: string;
  video_url: string | null;
  conteudo: string | null;
}

export default function AdminTutoriaisPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [titulo, setTitulo] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [conteudo, setConteudo] = useState("");

  const queryClient = useQueryClient();

  const { data: tutoriais, isLoading } = useQuery({
    queryKey: ["admin-tutoriais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutoriais")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tutorial[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        titulo,
        video_url: videoUrl || null,
        conteudo: conteudo || null,
      };

      if (isEditing && selectedTutorial) {
        const { error } = await supabase
          .from("tutoriais")
          .update(payload)
          .eq("id", selectedTutorial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tutoriais").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tutoriais"] });
      queryClient.invalidateQueries({ queryKey: ["tutoriais"] });
      toast.success(isEditing ? "Tutorial atualizado!" : "Tutorial criado!");
      handleClose();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao salvar tutorial.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tutoriais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tutoriais"] });
      queryClient.invalidateQueries({ queryKey: ["tutoriais"] });
      toast.success("Tutorial excluído!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao excluir tutorial.");
    },
  });

  const handleEdit = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setTitulo(tutorial.titulo);
    setVideoUrl(tutorial.video_url || "");
    setConteudo(tutorial.conteudo || "");
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsEditing(false);
    setSelectedTutorial(null);
    setTitulo("");
    setVideoUrl("");
    setConteudo("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este tutorial?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Tutoriais</h1>
          <p className="text-muted-foreground">Adicione vídeos e guias de como baixar músicas</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Tutorial
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Tutorial" : "Novo Tutorial"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input 
                  placeholder="Ex: Como baixar no computador" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Link do Vídeo (YouTube)</label>
                <Input 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Conteúdo do Tutorial</label>
                <Textarea 
                  placeholder="Instruções em texto..." 
                  className="min-h-[150px]"
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button 
                onClick={() => upsertMutation.mutate()}
                disabled={!titulo || upsertMutation.isPending}
              >
                {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Criar Tutorial"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Vídeo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : tutoriais && tutoriais.length > 0 ? (
              tutoriais.map((tutorial) => (
                <TableRow key={tutorial.id}>
                  <TableCell className="font-medium">{tutorial.titulo}</TableCell>
                  <TableCell>
                    {tutorial.video_url ? (
                      <a 
                        href={tutorial.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-primary hover:underline gap-1"
                      >
                        <Video className="h-4 w-4" /> Vídeo
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem vídeo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(tutorial)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(tutorial.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  Nenhum tutorial cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}