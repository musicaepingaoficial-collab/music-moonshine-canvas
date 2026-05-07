import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
  MessageCircle,
  Play,
  Sparkles,
  Clock,
  XCircle,
  ListMusic,
  Library,
  ArrowRight,
  TrendingUp,
  Users,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useUser";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.jpeg";
import heroMockup from "@/assets/hero-mockup.jpg";
import { PublicCheckoutDialog } from "@/components/subscription/PublicCheckoutDialog";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { trackEvent } from "@/lib/pixels";

const GENRES = [
  "Sertanejo", "Funk", "Forró", "Piseiro", "Arrocha", "Flash Back",
  "Dance", "Eletrônicas", "Rock", "Pop", "Reggae", "Samba",
  "Pagode", "Hip Hop", "MPB", "Reggaeton", "Moda de Viola", "Gospel",
  "Axé", "Rap e Trap", "Românticas", "Brega", "Country", "Eurodance",
];

const PROBLEMS = [
  { icon: Clock, title: "Horas perdidas procurando", desc: "Você gasta seu tempo precioso garimpando músicas em sites duvidosos." },
  { icon: XCircle, title: "Links quebrados o tempo todo", desc: "Acha a música, clica para baixar e o link não funciona. De novo." },
  { icon: Music2, title: "Qualidade ruim", desc: "Arquivos em 128kbps, com vinheta, cortados ou com áudio péssimo." },
  { icon: Library, title: "Tudo desorganizado", desc: "Pastas confusas, sem capa, sem ordem. Um caos para tocar no evento." },
  { icon: RefreshCw, title: "Nunca atualizado", desc: "Quando você acha o site bom, ele para de receber músicas novas." },
  { icon: Smartphone, title: "Não funciona no celular", desc: "Sites travam no mobile, anúncios pop-up por todo lado, baixar é um inferno." },
];

const FEATURES = [
  { icon: Headphones, title: "Ouça antes de baixar", desc: "Player integrado: dê o play e escute cada faixa antes do download." },
  { icon: Download, title: "Download em 1 clique", desc: "Baixe faixa a faixa ou o pack completo com apenas um toque." },
  { icon: Search, title: "Pesquisa inteligente", desc: "Encontre qualquer música, artista ou estilo em segundos." },
  { icon: ListMusic, title: "Playlists organizadas", desc: "Tudo separado por gênero, mês e tendências do momento." },
  { icon: RefreshCw, title: "Atualizações mensais", desc: "Receba os hits novos direto no seu painel todos os meses." },
  { icon: Crown, title: "Acesso vitalício disponível", desc: "Pague uma vez e tenha o painel para sempre, sem mensalidade." },
  { icon: Smartphone, title: "Funciona no celular", desc: "Sem instalar app. Acesse de qualquer lugar, no celular ou PC." },
  { icon: Music2, title: "MP3 em 320 KBPS", desc: "Áudio limpo, profissional, com capinha em todas as faixas." },
  { icon: Library, title: "Packs completos", desc: "Discografias, coletâneas e packs prontos para o seu evento." },
  { icon: Zap, title: "Acesso imediato", desc: "Pagou, recebeu o login. Comece a baixar em segundos." },
];

const TESTIMONIALS = [
  { name: "Carlos Mendes", role: "DJ — São Paulo/SP", text: "Cara, mudou meu jogo. Eu pagava 3 sites diferentes e nenhum tinha tudo. Aqui é tudo num lugar só, e o player pra ouvir antes salva minha vida.", rating: 5 },
  { name: "Rafael 'RM Som'", role: "Dono de Paredão — Recife/PE", text: "Os pack de funk e arrocha tão sempre atualizados. Atualização todo mês mesmo. Vale cada centavo do vitalício.", rating: 5 },
  { name: "Juliana Reis", role: "Criadora de Conteúdo", text: "Uso pra trilha dos meus reels. A organização por estilo é absurda, acho qualquer coisa em segundos.", rating: 5 },
  { name: "Edinho Marques", role: "Som Automotivo — Goiânia/GO", text: "Comprei o vitalício mês passado. Já economizei mais do que paguei só não comprando avulso. Recomendo demais.", rating: 5 },
  { name: "Bruno Campos", role: "DJ de Casamento", text: "Flashback, MPB, sertanejo raiz, eletrônica… o cara achar tudo isso em 320kbps num só lugar é coisa rara.", rating: 5 },
  { name: "Patrícia Lima", role: "Produtora de Eventos", text: "Painel super profissional. Suporte responde rápido e o sistema nunca cai. Indispensável pra quem trabalha com música.", rating: 5 },
];

const FAQ = [
  { q: "Posso ouvir as músicas antes de baixar?", a: "Sim. O painel tem player integrado — você dá play e escuta a faixa completa antes de decidir baixar." },
  { q: "Funciona no celular?", a: "Funciona perfeitamente. O sistema é 100% online e responsivo. Você acessa pelo navegador do celular sem precisar instalar nada." },
  { q: "Como recebo o acesso?", a: "Após a confirmação do pagamento (instantânea no PIX e cartão), você recebe login e senha por e-mail e já pode entrar no painel." },
  { q: "Preciso pagar mensalidade?", a: "Você escolhe: planos mensal, semestral, anual ou vitalício. No vitalício é pagamento único e o acesso é para sempre." },
  { q: "Qual é a qualidade das músicas?", a: "Todas as faixas em MP3 320 Kbps, sem vinhetas, com capinha e organizadas por estilo." },
  { q: "Posso baixar packs completos?", a: "Sim. Você pode baixar faixa por faixa ou o pack inteiro com 1 clique." },
  { q: "Tenho garantia?", a: "Sim, 7 dias de garantia incondicional. Se não gostar, devolvemos 100% do seu dinheiro sem perguntas." },
  { q: "Posso passar pra um pendrive?", a: "Claro. Depois de baixar, é só copiar para o pendrive normalmente." },
  { q: "Quais formas de pagamento?", a: "PIX, cartão de crédito (com parcelamento) e boleto, em ambiente 100% seguro." },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<{ slug: string; name: string; price: number } | null>(null);
  const { data: siteSettings } = useSiteSettings();
  const waNumber = (siteSettings?.whatsapp_number || "").replace(/\D/g, "");
  const waLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Olá, quero saber mais sobre o painel")}`
    : null;

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

  useEffect(() => {
    trackEvent("view_content", { content_category: "landing", content_name: "LandingPage" });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user && !checkoutPlan) return <Navigate to="/dashboard" replace />;

  const scrollToPrices = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  const visiblePlanos = (planos ?? []).filter((p: any) => p.slug !== "discografias");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* NAV */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-background/85 backdrop-blur-xl border-b border-border/60" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Repertório Música e Pinga" className="h-10 w-10 rounded-lg object-cover ring-1 ring-primary/40" />
            <span className="font-bold text-sm sm:text-base hidden sm:block">
              Repertório <span className="text-primary">Música e Pinga</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-primary">
                Entrar
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={scrollToPrices}
              className="bg-gradient-cta hover:opacity-90 text-primary-foreground shadow-glow font-semibold"
            >
              Acessar agora
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-primary/20 rounded-full blur-[160px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-primary mb-6 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                +100 mil músicas • Atualizado mensalmente
              </div>

              <h1 className="text-[2.25rem] leading-[1.05] sm:text-5xl lg:text-[4rem] lg:leading-[1.02] font-black tracking-tight">
                O Painel de Repertórios{" "}
                <span className="text-gradient-brand">Mais Completo</span> do Brasil
              </h1>

              <p className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-xl lg:max-w-[560px] mx-auto lg:mx-0 leading-relaxed">
                Mais de <span className="text-foreground font-semibold">100 mil músicas em 320kbps</span>,
                organizadas, atualizadas e prontas para download. Pare de perder tempo procurando
                música em sites quebrados.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={scrollToPrices}
                  className="bg-gradient-cta hover:opacity-95 text-primary-foreground text-base h-14 px-8 font-bold shadow-glow animate-glow-pulse rounded-xl"
                >
                  <Play className="mr-2 h-5 w-5 fill-current" />
                  QUERO ACESSAR AGORA
                </Button>
                <Link to="/login" className="sm:self-center">
                  <Button size="lg" variant="ghost" className="text-base h-14 px-6 w-full sm:w-auto text-foreground/80 hover:text-primary">
                    Já sou cliente →
                  </Button>
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />Acesso imediato</div>
                <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />7 dias de garantia</div>
                <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />320 KBPS</div>
                <div className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" />Download 1 clique</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative"
            >
              <div className="absolute -inset-6 bg-primary/25 blur-3xl rounded-full -z-10" />
              <div className="relative rounded-2xl overflow-hidden border border-primary/30 shadow-premium animate-float">
                <img
                  src={heroMockup}
                  alt="Painel de repertórios com mais de 100 mil músicas"
                  className="w-full h-auto"
                  width={1536}
                  height={1024}
                />
              </div>

              {/* floating chips */}
              <div className="hidden sm:flex absolute -left-4 -bottom-4 lg:-left-8 lg:bottom-8 bg-card/90 backdrop-blur-xl border border-primary/30 rounded-2xl px-4 py-3 shadow-glow items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Music2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">No painel</div>
                  <div className="text-sm font-bold">+100.000 músicas</div>
                </div>
              </div>
              <div className="hidden sm:flex absolute -right-4 -top-4 lg:-right-6 lg:top-12 bg-card/90 backdrop-blur-xl border border-primary/30 rounded-2xl px-4 py-3 shadow-glow items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Download em</div>
                  <div className="text-sm font-bold">1 clique • 320kbps</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* GENRES MARQUEE */}
      <section className="py-6 border-y border-border/40 bg-card/30 overflow-hidden">
        <div className="flex w-max animate-marquee gap-3">
          {[...GENRES, ...GENRES].map((g, i) => (
            <span
              key={i}
              className="px-5 py-2 rounded-full border border-primary/20 bg-card/60 text-sm font-medium whitespace-nowrap"
            >
              {g}
            </span>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-block text-xs uppercase tracking-[0.2em] text-destructive/80 font-semibold mb-3">
              Você reconhece isso?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Cansado de perder tempo com{" "}
              <span className="text-destructive">sites quebrados</span> e músicas em baixa qualidade?
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PROBLEMS.map((p, i) => (
              <motion.div
                key={p.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Card className="p-6 bg-card/60 border-border/60 h-full hover:border-destructive/40 transition-colors">
                  <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                    <p.icon className="h-5 w-5 text-destructive" />
                  </div>
                  <h3 className="font-bold text-base mb-1.5">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-14 text-center">
            <p className="text-2xl sm:text-3xl font-black tracking-tight">
              Chega disso. <span className="text-gradient-brand">A gente resolve tudo.</span>
            </p>
            <ArrowRight className="h-8 w-8 text-primary mx-auto mt-4 rotate-90 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-20 sm:py-28 border-t border-border/40 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">
              A solução completa
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Tudo que você precisa em um <span className="text-gradient-brand">único painel</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg">
              Recursos premium pensados para DJs, paredões, criadores e quem vive de música.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ duration: 0.45, delay: i * 0.04 }}
              >
                <Card className="p-5 h-full bg-card/60 border-border/60 hover:border-primary/60 hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/25 group-hover:scale-110 transition-all">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* GENRES GRID */}
      <section className="py-20 sm:py-28 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">
              Todos os estilos
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Do <span className="text-gradient-brand">Sertanejo</span> ao{" "}
              <span className="text-gradient-brand">Eletrônico</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg">
              Milhares de playlists organizadas por estilo, prontas para qualquer pista.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {GENRES.map((g) => (
              <div
                key={g}
                className="group relative px-4 py-4 rounded-xl bg-card/60 border border-border/60 hover:border-primary/60 hover:bg-primary/10 transition-all cursor-default text-center"
              >
                <Music2 className="h-4 w-4 text-primary/70 mx-auto mb-1.5 group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium">{g}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-20 sm:py-28 border-t border-border/40 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 max-w-5xl mx-auto">
            {[
              { icon: Music2, value: "+100K", label: "Músicas no painel" },
              { icon: Download, value: "+50K", label: "Downloads por mês" },
              { icon: Users, value: "+43K", label: "Clientes ativos" },
              { icon: Star, value: "4.9★", label: "Avaliação média" },
            ].map((s) => (
              <Card key={s.label} className="p-6 text-center bg-card/60 border-primary/20 hover:border-primary/50 transition-colors">
                <s.icon className="h-7 w-7 text-primary mx-auto mb-2" />
                <div className="text-3xl sm:text-4xl font-black text-gradient-brand">{s.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</div>
              </Card>
            ))}
          </motion.div>

          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">
              Quem usa, recomenda
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Milhares de profissionais <span className="text-gradient-brand">já confiam</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.05 }}>
                <Card className="p-6 bg-card/60 border-border/60 h-full hover:border-primary/40 transition-colors">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                    <div className="h-10 w-10 rounded-full bg-gradient-cta flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="py-20 sm:py-28 border-t border-border/40 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/15 via-background to-background" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">
              Escolha seu acesso
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Planos para todos <span className="text-gradient-brand">os gostos !{"\n"}</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-base sm:text-lg">
              Pagamento único ou recorrente. Acesso liberado em segundos após a confirmação.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {visiblePlanos.map((p: any, idx: number) => {
              const isLifetime = p.slug === "vitalicio";
              const isSemestral = p.slug === "semestral";
              const isHighlight = isLifetime;
              const periodLabel =
                p.slug === "mensal" ? "/ mês" :
                p.slug === "semestral" ? "/ 6 meses" :
                p.slug === "anual" ? "/ ano" : "pagamento único";
              return (
                <motion.div
                  key={p.id}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: idx * 0.06 }}
                >
                  <Card
                    className={`relative p-6 h-full flex flex-col bg-card/80 backdrop-blur transition-all ${
                      isHighlight
                        ? "border-primary shadow-glow-lg lg:scale-[1.04] lg:-translate-y-1"
                        : "border-border/60 hover:border-primary/50"
                    }`}
                  >
                    {isHighlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-cta text-primary-foreground text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-glow">
                        <Crown className="h-3 w-3" />
                        Melhor Custo
                      </div>
                    )}
                    {isSemestral && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-card border border-primary/60 text-primary text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Mais Vendido
                      </div>
                    )}

                    <h3 className="text-lg font-black uppercase tracking-wide">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-5 min-h-[32px]">{p.description}</p>

                    <div className="mb-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <span className="text-4xl font-black">
                          {Number(p.price).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{periodLabel}</span>
                    </div>

                    <ul className="space-y-2.5 text-sm flex-1 mb-6">
                      <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />+100 mil músicas</li>
                      <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Download faixa a faixa</li>
                      <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Packs completos</li>
                      <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Pesquisa inteligente</li>
                      <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Atualizações mensais</li>
                      <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />MP3 320 KBPS</li>
                      {isLifetime && (
                        <li className="flex gap-2 font-semibold text-primary">
                          <Check className="h-4 w-4 shrink-0 mt-0.5" />Acesso vitalício
                        </li>
                      )}
                      {(isLifetime || p.slug === "anual") && (
                        <li className="flex gap-2 font-semibold text-primary">
                          <Crown className="h-4 w-4 shrink-0 mt-0.5" />Discografias inclusas
                        </li>
                      )}
                    </ul>

                    <Button
                      onClick={() => {
                        trackEvent("add_to_cart", {
                          value: Number(p.price),
                          currency: "BRL",
                          content_ids: [p.slug],
                          content_name: p.name,
                        });
                        setCheckoutPlan({ slug: p.slug, name: p.name, price: Number(p.price) });
                      }}
                      className={`mt-auto w-full font-bold h-12 ${
                        isHighlight
                          ? "bg-gradient-cta text-primary-foreground shadow-glow hover:opacity-95"
                          : "bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/40"
                      }`}
                    >
                      QUERO ESTE PLANO
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* GUARANTEE */}
          <motion.div {...fadeUp} className="mt-16 max-w-3xl mx-auto">
            <Card className="relative overflow-hidden p-8 sm:p-10 text-center bg-card/70 border-primary/40">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent -z-10" />
              <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/15 items-center justify-center mb-4 shadow-glow">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
                Garantia incondicional
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                7 dias para testar. <span className="text-gradient-brand">Sem risco.</span>
              </h3>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Acesse o painel, baixe quantas músicas quiser e teste todos os recursos. Se por
                qualquer motivo não gostar, é só pedir e devolvemos 100% do seu dinheiro. Sem
                burocracia, sem perguntas.
              </p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 border-t border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="inline-block text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">
              Tire suas dúvidas
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Perguntas <span className="text-gradient-brand">frequentes</span>
            </h2>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/60 rounded-xl px-5 bg-card/40 hover:bg-card/70 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 text-sm sm:text-base font-semibold">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 sm:py-32 border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-background" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/15 rounded-full blur-[160px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-primary mb-6">
              <Award className="h-3.5 w-3.5" />
              Acesso liberado em segundos
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
              Pronto para parar de perder tempo e{" "}
              <span className="text-gradient-brand">ter agora o melhor Repertório no Seu Pendrive ?</span>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Mais de 100 mil músicas em 320kbps, atualizações mensais e download em 1 clique
              esperando por você. Junte-se aos +43 mil profissionais que já garantiram o acesso.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={scrollToPrices}
                className="bg-gradient-cta hover:opacity-95 text-primary-foreground h-14 px-10 text-base font-black shadow-glow animate-glow-pulse rounded-xl"
              >
                <Play className="mr-2 h-5 w-5 fill-current" />
                QUERO ACESSAR AGORA
              </Button>
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base w-full sm:w-auto border-primary/40 hover:border-primary hover:bg-primary/10">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Falar no WhatsApp
                  </Button>
                </a>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" />7 dias de garantia</div>
              <div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" />Acesso imediato</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" />Pagamento 100% seguro</div>
            </div>
          </motion.div>
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
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-primary transition-colors">Entrar</Link>
            <button onClick={scrollToPrices} className="hover:text-primary transition-colors">Planos</button>
            <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
            <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Olá, quero tirar uma dúvida")}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-gradient-cta text-primary-foreground shadow-glow flex items-center justify-center transition-transform hover:scale-110 animate-glow-pulse"
          aria-label="Falar no WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}

      <PublicCheckoutDialog
        open={!!checkoutPlan}
        onOpenChange={(o) => !o && setCheckoutPlan(null)}
        plan={checkoutPlan}
      />
    </div>
  );
}
