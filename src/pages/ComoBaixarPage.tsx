import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Video, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComoBaixarPage() {
  const { data: tutoriais, isLoading } = useQuery({
    queryKey: ["tutoriais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutoriais")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Download className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Como Baixar</h1>
          <p className="text-muted-foreground">Aprenda a baixar suas músicas e repertórios</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="overflow-hidden border-border/50">
              <CardHeader>
                <Skeleton className="h-7 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tutoriais && tutoriais.length > 0 ? (
        <div className="space-y-8">
          {tutoriais.map((tutorial) => (
            <Card key={tutorial.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  {tutorial.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {tutorial.video_url && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted group">
                    {getYoutubeId(tutorial.video_url) ? (
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${getYoutubeId(tutorial.video_url)}`}
                        title={tutorial.titulo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Video className="h-10 w-10 opacity-20" />
                        <a 
                          href={tutorial.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          Assistir vídeo externo
                        </a>
                      </div>
                    )}
                  </div>
                )}
                
                {tutorial.conteudo && (
                  <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {tutorial.conteudo}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-medium">Nenhum tutorial encontrado</p>
              <p className="text-muted-foreground">O administrador ainda não adicionou tutoriais de como baixar.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}