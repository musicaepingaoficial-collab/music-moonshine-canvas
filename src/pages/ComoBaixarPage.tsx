import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Video, Info, Laptop, Smartphone, Monitor, Usb, Tablet, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

  const tutorialPassos = {
    pc: [
      {
        titulo: "Baixar no Computador",
        instrucao: "Acesse sua biblioteca ou repertório, escolha as músicas e clique no botão de download (ícone de nuvem com seta).",
        img: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "Conectar Pendrive",
        instrucao: "Insira o pendrive em uma porta USB disponível no seu computador. Ele aparecerá como 'Unidade de Disco' no Explorador de Arquivos (Windows) ou Finder (Mac).",
        img: "https://images.unsplash.com/photo-1622534517331-89315570220a?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "Transferir Arquivos",
        instrucao: "Localize os arquivos baixados (geralmente na pasta 'Downloads'), selecione-os e arraste para dentro da unidade do seu pendrive.",
        img: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=800",
      }
    ],
    android: [
      {
        titulo: "Baixar no Android",
        instrucao: "No navegador do seu Android, clique para baixar as músicas. Elas serão salvas na pasta 'Downloads' do sistema.",
        img: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbab?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "Usar Adaptador OTG",
        instrucao: "Conecte seu pendrive a um adaptador OTG e ligue-o na entrada de carregamento do seu celular Android.",
        img: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "Gerenciador de Arquivos",
        instrucao: "Abra o aplicativo 'Meus Arquivos' ou 'Files', vá em Downloads, selecione as músicas e escolha 'Mover' ou 'Copiar' para o 'Armazenamento USB'.",
        img: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800",
      }
    ],
    ios: [
      {
        titulo: "Baixar no iPhone/iPad",
        instrucao: "Ao baixar o arquivo, o iOS perguntará se deseja baixar. Confirme e o progresso aparecerá na barra do Safari.",
        img: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "Conectar Adaptador Lightning/USB-C",
        instrucao: "Use um adaptador de Câmera (Lightning para USB) ou conecte diretamente se seu iPhone/iPad for USB-C.",
        img: "https://images.unsplash.com/photo-1556656793-062ff98782ee?auto=format&fit=crop&q=80&w=800",
      },
      {
        titulo: "App Arquivos (Files)",
        instrucao: "Abra o app 'Arquivos', vá em 'Explorar' > 'No Meu iPhone' > 'Downloads'. Pressione e segure o arquivo, selecione 'Mover' e escolha o seu Pendrive na lista.",
        img: "https://images.unsplash.com/photo-1523206489230-c012cdd4cc2a?auto=format&fit=crop&q=80&w=800",
      }
    ]
  };

  const SkeletonPlaceholder = () => (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <Card key={i} className="overflow-hidden border-border/50">
          <CardHeader>
            <div className="h-7 w-1/3 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-20 w-full bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Download className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Como Baixar</h1>
          <p className="text-muted-foreground">Aprenda a baixar e transferir suas músicas</p>
        </div>
      </div>

      <Tabs defaultValue="tutoriais" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger value="tutoriais" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Vídeo Aulas
          </TabsTrigger>
          <TabsTrigger value="escrito" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Passo a Passo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutoriais">
          {isLoading ? (
            <SkeletonPlaceholder />
          ) : tutoriais && tutoriais.length > 0 ? (
            <div className="grid gap-8">
              {tutoriais.map((tutorial) => (
                <Card key={tutorial.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      {tutorial.titulo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {tutorial.video_url && (
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted group border border-border/50">
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
                      <div className="prose prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-lg">
                        {tutorial.conteudo}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 py-12 bg-transparent">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-muted/50 rounded-full">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-medium">Nenhum vídeo tutorial encontrado</p>
                  <p className="text-muted-foreground">Aguarde, em breve novos vídeos serão adicionados.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="escrito" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Usb className="h-5 w-5 text-primary" />
                Tutorial: Do Site para o Pendrive
              </CardTitle>
              <CardDescription>
                Selecione seu dispositivo abaixo para ver as instruções detalhadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pc" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 bg-muted/30">
                  <TabsTrigger value="pc" className="flex items-center gap-2">
                    <Laptop className="h-4 w-4" />
                    PC
                  </TabsTrigger>
                  <TabsTrigger value="android" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Android
                  </TabsTrigger>
                  <TabsTrigger value="ios" className="flex items-center gap-2">
                    <Tablet className="h-4 w-4" />
                    iOS
                  </TabsTrigger>
                </TabsList>

                {(Object.entries(tutorialPassos) as [keyof typeof tutorialPassos, any[]][]).map(([key, passos]) => (
                  <TabsContent key={key} value={key} className="space-y-6 mt-4">
                    <Accordion type="single" collapsible defaultValue="passo-0" className="w-full">
                      {passos.map((passo, index) => (
                        <AccordionItem key={index} value={`passo-${index}`} className="border-border/50">
                          <AccordionTrigger className="hover:no-underline hover:bg-muted/30 px-4 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                                {index + 1}
                              </span>
                              <span className="text-base font-semibold">{passo.titulo}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 px-4 pb-6">
                            <div className="grid md:grid-cols-2 gap-6 items-center">
                              <div className="space-y-4">
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                  {passo.instrucao}
                                </p>
                                <div className="flex items-start gap-2 text-sm text-primary/80 bg-primary/5 p-3 rounded-md border border-primary/10">
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                                  <span>Dica: Verifique se o pendrive tem espaço suficiente.</span>
                                </div>
                              </div>
                              <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/5">
                                <img 
                                  src={passo.img} 
                                  alt={passo.titulo}
                                  className="object-cover w-full h-full transition-transform duration-500 hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="p-3 bg-primary/10 rounded-full">
              <Monitor className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg">Ainda com dúvidas?</h4>
              <p className="text-muted-foreground">Assista aos vídeos na primeira aba ou entre em contato com nosso suporte.</p>
            </div>
            <a 
              href="https://wa.me/5500000000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
            >
              Suporte WhatsApp
            </a>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}