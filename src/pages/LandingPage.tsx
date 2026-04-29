import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Music2,
  Search,
  Download,
  Headphones,
  Smartphone,
  RefreshCw,
  Shield,
  Star,
  Zap,
  Crown,
  ChevronDown,
  MessageCircle,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.jpeg";

const GENRES = [
  "Sertanejo", "Eletrônicas", "Flash Back", "Dance", "Forró", "Pagode",
  "Rock", "Pop", "Gospel", "Funk", "Hip Hop", "Axé", "Arrocha", "Bossa Nova",
  "Brega", "Carnaval", "Country", "Eurodance", "MPB", "Moda de Viola",
  "Piseiro", "Rap e Trap", "Reggaeton", "Românticas", "Reggae", "Samba",
];

const FEATURES = [
  { icon: Headphones, title: "Ouça antes de baixar", desc: "Dê o play e escute a música antes de fazer o download." },
  { icon: Search, title: "Pesquisa inteligente", desc: "Encontre músicas e artistas em segundos com nossa busca otimizada." },
  { icon: Download, title: "Download com 1 clique", desc: "Baixe faixa por faixa ou o pack completo com apenas um clique." },
  { icon: Music2, title: "MP3 em 320 KBPS", desc: "Áudio de alta qualidade com capinha em todas as faixas." },
  { icon: RefreshCw, title: "Atualizações mensais", desc: "Receba os hits do momento direto no seu painel todo mês." },
  { icon: Smartphone, title: "Acesse no celular", desc: "Tudo online, sem instalar app, no celular ou no computador." },
];

const REASONS = [
  "Ouça as músicas antes de baixar",
  "Baixe faixa por faixa com 1 clique",
  "Sistema de pesquisa otimizado",
  "Versões originais e remixagens exclusivas",
  "Atualizações mensais com músicas do momento",
  "Download do pack completo com 1 clique",
  "Acesso vitalício disponível",
  "Músicas em alta qualidade (320 Kbps)",
  "Ganhe tempo, tudo organizado em playlists",
  "Login e senha para acessar quando quiser",
];

const FAQ = [
  { q: "Dá para ouvir as músicas antes de baixar?", a: "Sim, você pode ouvir todas as músicas das playlists antes de baixar. Não precisa baixar o pack inteiro para ouvir." },
  { q: "Posso baixar faixa por faixa ou só o pack inteiro?", a: "Você pode baixar das duas formas: música por música ou o pack completo de uma vez, com apenas 1 clique." },
  { q: "Quantas músicas eu vou receber?", a: "Você terá acesso a mais de 100 mil músicas organizadas em playlists por gênero, mais bônus exclusivos." },
  { q: "Preciso pagar mensalidade?", a: "Você pode escolher entre planos mensal, semestral, anual ou vitalício. No plano Vitalício o pagamento é único e o acesso é para sempre." },
  { q: "Como recebo o acesso?", a: "Após confirmar o pagamento, você recebe automaticamente login e senha por e-mail para acessar o painel imediatamente." },
  { q: "Qual é a qualidade das músicas?", a: "Todas as músicas estão em alta qualidade, MP3 em 320 Kbps, sem vinhetas e organizadas com capinhas." },
  { q: "Posso passar as músicas para o meu pendrive?", a: "Sim, basta fazer o download das músicas e copiar para o pendrive normalmente." },
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos cartão de crédito, PIX e boleto através de uma plataforma 100% segura." },
  { q: "Tenho garantia?", a: "Sim, você tem 7 dias de garantia incondicional. Se não gostar, devolvemos seu dinheiro sem perguntas." },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const { data: planos } = useQuery({
    queryKey: ["public-planos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("planos")
        .select("*")
        .eq("active", true)
        .order("price", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authenticated users go to dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  const scrollToPrices = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-background/85 backdrop-blur-xl border-b border-border/60" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Repertório Música e Pinga" className="h-10 w-10 rounded-lg object-cover" />
            <span className="font-bold text-sm sm:text-base hidden sm:block">
              Repertório <span className="text-primary">Música e Pinga</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
                Entrar
              </Button>
            </Link>
            <Button size="sm" onClick={scrollToPrices} className="bg-primary hover:bg-primary/90">
              Ver planos
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        {/* background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-background to-background" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs sm:text-sm text-primary mb-6">
                <Zap className="h-3.5 w-3.5" />
                Mais de 100 mil músicas atualizadas
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
                Packs de músicas
                <br />
                <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
                  separados em playlists.
                </span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl lg:max-w-none lg:pr-8">
                Ouça online e baixe músicas exclusivas e atualizadas, sem anúncios e sem
                interrupções. Tudo em MP3 320 Kbps, organizado por gênero e com download em 1 clique.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button size="lg" onClick={scrollToPrices} className="bg-primary hover:bg-primary/90 text-base h-12 px-8">
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Quero acessar agora
                </Button>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="text-base h-12 px-8 w-full sm:w-auto">
                    Já sou cliente
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" />7 dias de garantia</div>
                <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />Acesso imediato</div>
                <div className="flex items-center gap-1.5"><Star className="h-4 w-4 text-primary" />+43 mil clientes</div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-transparent blur-3xl -z-10" />
              <div className="relative aspect-square max-w-md mx-auto rounded-3xl overflow-hidden border border-border/50 shadow-2xl shadow-primary/20">
                <img src={logo} alt="Repertório Música e Pinga" className="w-full h-full object-cover" />
              </div>
              {/* floating chips */}
              <div className="hidden sm:block absolute -left-4 top-10 bg-card/90 backdrop-blur border border-border rounded-2xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                    <Music2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total no painel</div>
                    <div className="text-sm font-semibold">+100.000 músicas</div>
                  </div>
                </div>
              </div>
              <div className="hidden sm:block absolute -right-4 bottom-10 bg-card/90 backdrop-blur border border-border rounded-2xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Download em</div>
                    <div className="text-sm font-semibold">1 clique • 320kbps</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 sm:py-28 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              O painel mais completo da internet
            </h2>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg">
              Recursos pensados para você ouvir, encontrar e baixar suas músicas com facilidade.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-6 bg-card/60 border-border/60 hover:border-primary/50 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* GENRES */}
      <section className="py-20 sm:py-24 border-t border-border/40 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Mais de <span className="text-primary">100 mil músicas</span>
              <br /> em dezenas de gêneros
            </h2>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg">
              Playlists separadas por estilo, prontas para ouvir e baixar.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {GENRES.map((g) => (
              <span
                key={g}
                className="px-4 py-2 rounded-full bg-card border border-border/60 text-sm hover:border-primary/60 hover:text-primary transition-colors cursor-default"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-20 sm:py-28 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Por que você não pode <span className="text-primary">ficar de fora</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg">
              Confira tudo o que está te esperando dentro do painel.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 max-w-4xl mx-auto">
            {REASONS.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm sm:text-base text-foreground/90">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="py-20 sm:py-28 border-t border-border/40 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Escolha seu <span className="text-primary">plano</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg">
              Pagamento único ou mensal. Acesso imediato após a confirmação.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {(planos ?? []).map((p) => {
              const isLifetime = p.slug === "vitalicio";
              const periodLabel =
                p.slug === "mensal" ? "/ mês" :
                p.slug === "semestral" ? "/ 6 meses" :
                p.slug === "anual" ? "/ ano" : "/ vitalício";
              return (
                <Card
                  key={p.id}
                  className={`relative p-6 flex flex-col bg-card/70 border ${
                    isLifetime ? "border-primary shadow-2xl shadow-primary/20 scale-[1.02]" : "border-border/60"
                  } hover:border-primary/60 transition-all`}
                >
                  {isLifetime && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Mais vendido
                    </div>
                  )}
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-5">{p.description}</p>
                  <div className="mb-5">
                    <span className="text-4xl font-extrabold">
                      R$ {Number(p.price).toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">{periodLabel}</span>
                  </div>
                  <ul className="space-y-2.5 text-sm flex-1 mb-6">
                    <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Acesso a +100 mil músicas</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Download faixa a faixa</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Download de packs completos</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Pesquisa inteligente</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Atualizações mensais</li>
                    {isLifetime && (
                      <li className="flex gap-2 font-medium text-primary">
                        <Check className="h-4 w-4 shrink-0 mt-0.5" />Acesso vitalício
                      </li>
                    )}
                  </ul>
                  <Link to="/login" className="mt-auto">
                    <Button className={`w-full ${isLifetime ? "bg-primary hover:bg-primary/90" : ""}`} variant={isLifetime ? "default" : "outline"}>
                      Comprar agora
                    </Button>
                  </Link>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 max-w-2xl mx-auto text-center bg-card/60 border border-border/60 rounded-2xl p-6 sm:p-8">
            <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold">7 dias de garantia incondicional</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesse o painel, baixe suas músicas e teste todos os recursos. Se não gostar,
              devolvemos seu dinheiro sem perguntas.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Perguntas <span className="text-primary">frequentes</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tire todas as suas dúvidas sobre o nosso painel.
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/60 rounded-xl px-5 bg-card/40"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 text-sm sm:text-base font-medium">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 sm:py-28 border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Pronto para entrar no <span className="text-primary">maior painel de músicas</span> do Brasil?
          </h2>
          <p className="mt-5 text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Mais de 100 mil músicas, atualizações mensais e download em 1 clique te esperando.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={scrollToPrices} className="bg-primary hover:bg-primary/90 h-12 px-8 text-base">
              <Play className="mr-2 h-4 w-4 fill-current" />
              Quero acessar agora
            </Button>
            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20painel"
              target="_blank"
              rel="noreferrer"
            >
              <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto">
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar no WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Repertório Música e Pinga" className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Repertório Música e Pinga. Todos os direitos reservados.
            </span>
          </div>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-primary transition-colors">Entrar</Link>
            <button onClick={scrollToPrices} className="hover:text-primary transition-colors">Planos</button>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20quero%20tirar%20uma%20d%C3%BAvida"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/40 flex items-center justify-center transition-transform hover:scale-110"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      {/* Scroll hint */}
      <button
        onClick={scrollToPrices}
        className="hidden lg:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-30 items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors animate-bounce"
        aria-label="Ver planos"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
