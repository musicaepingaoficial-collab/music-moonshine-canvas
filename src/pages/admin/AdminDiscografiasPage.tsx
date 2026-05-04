import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Link as LinkIcon, Loader2, Image as ImageIcon, ExternalLink, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface DiscografiaLink {
  label: string;
  url: string;
}

interface Discografia {
  id: string;
  artista_nome: string;
  imagem_url: string | null;
  links: any; // Using any for Json compatibility
  ordem: number;
}

export default function AdminDiscografiasPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDiscografia, setSelectedDiscografia] = useState<Discografia | null>(null);
  const [artistaNome, setArtistaNome] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [links, setLinks] = useState<DiscografiaLink[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const queryClient = useQueryClient();

  const { data: discografias, isLoading } = useQuery({
    queryKey: ["admin-discografias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discografias")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as Discografia[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        artista_nome: artistaNome,
        imagem_url: imagemUrl || null,
        links: links as any,
      };

      if (isEditing && selectedDiscografia) {
        const { error } = await supabase
          .from("discografias")
          .update(payload)
          .eq("id", selectedDiscografia.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("discografias").insert([payload as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-discografias"] });
      queryClient.invalidateQueries({ queryKey: ["discografias"] });
      toast.success(isEditing ? "Discografia atualizada!" : "Discografia criada!");
      handleClose();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao salvar discografia.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discografias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-discografias"] });
      queryClient.invalidateQueries({ queryKey: ["discografias"] });
      toast.success("Discografia excluída!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao excluir discografia.");
    },
  });

  const handleEdit = (discografia: Discografia) => {
    setSelectedDiscografia(discografia);
    setArtistaNome(discografia.artista_nome);
    setImagemUrl(discografia.imagem_url || "");
    setLinks((discografia.links as DiscografiaLink[]) || []);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsEditing(false);
    setSelectedDiscografia(null);
    setArtistaNome("");
    setImagemUrl("");
    setLinks([]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta discografia?")) {
      deleteMutation.mutate(id);
    }
  };

  const addLink = () => {
    if (newLinkLabel && newLinkUrl) {
      setLinks([...links, { label: newLinkLabel, url: newLinkUrl }]);
      setNewLinkLabel("");
      setNewLinkUrl("");
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Discografias</h1>
          <p className="text-muted-foreground">Cadastre discografias de artistas com foto e links de download</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova Discografia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Discografia" : "Nova Discografia"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Artista</label>
                <Input 
                   placeholder="Ex: Zé Neto e Cristiano" 
                  value={artistaNome}
                  onChange={(e) => setArtistaNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL da Imagem/Foto</label>
                <Input 
                  placeholder="https://..." 
                  value={imagemUrl}
                  onChange={(e) => setImagemUrl(e.target.value)}
                />
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <label className="text-sm font-medium">Links de Download</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Nome (Ex: Álbum 2024)" 
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                  />
                  <Input 
                    placeholder="URL de download" 
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={addLink}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-lg text-sm">
                      <div className="flex flex-col truncate flex-1">
                        <span className="font-medium">{link.label}</span>
                        <span className="text-xs text-muted-foreground truncate">{link.url}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeLink(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button 
                onClick={() => upsertMutation.mutate()}
                disabled={!artistaNome || upsertMutation.isPending}
              >
                {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Criar Discografia"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artista</TableHead>
              <TableHead>Foto</TableHead>
              <TableHead>Links</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : discografias && discografias.length > 0 ? (
              discografias.map((disco) => (
                <TableRow key={disco.id}>
                  <TableCell className="font-medium">{disco.artista_nome}</TableCell>
                  <TableCell>
                    {disco.imagem_url ? (
                      <div className="h-10 w-10 rounded-full overflow-hidden border">
                        <img src={disco.imagem_url} alt={disco.artista_nome} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{(disco.links as any[])?.length || 0} links</span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(disco)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(disco.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Nenhuma discografia cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
