# Landing Page Premium — Recriação Completa (Verde)

Vou recriar totalmente a `src/pages/LandingPage.tsx` com copy persuasiva nível CRO e visual SaaS premium, **mantendo a paleta verde atual** (`--primary: 145 65% 42%`) com glow e gradientes. Toda a lógica atual (planos, checkout público, redirect de logado, filtro `discografias`) é preservada.

## Direção visual

- Fundo escuro existente + acento **verde primary** com **glow** e gradientes radiais
- Tipografia: display pesado (font-black, tracking-tight) para headlines
- Efeitos: glow verde, blur, gradient mesh, sombras, bordas com gradient, microanimações `framer-motion`
- CTAs grandes em verde com glow pulsante
- Mockup do painel (imagem gerada via `imagegen`, UI dark estilo Spotify/Netflix em tons verdes)
- Mobile-first (otimizado para 390px)

## Tokens novos no `index.css`

- `--brand-glow: 145 80% 55%`
- `--gradient-hero`, `--shadow-glow`, `--shadow-premium`
- Keyframes: `glow-pulse`, `float`, `marquee`

E mapear animações novas no `tailwind.config.ts`. **Nenhuma cor existente é alterada.**

## Estrutura da nova LandingPage

1. **Header sticky** — refinado com glow verde sutil
2. **HERO**
   - Eyebrow: "+100 MIL MÚSICAS • ATUALIZADO MENSALMENTE"
   - H1: **"O Painel de Repertórios Mais Completo do Brasil"**
   - Sub: "Mais de 100 mil músicas em 320kbps, organizadas, atualizadas e prontas para download. Pare de perder tempo procurando música em sites quebrados."
   - 4 trust pills: Acesso imediato • +100k músicas • 320kbps • Download 1 clique
   - CTA gigante verde com glow: **"QUERO ACESSAR AGORA"** + "7 dias de garantia"
   - Mockup flutuante do painel (desktop ao lado / mobile abaixo)
3. **Marquee de gêneros** — barra rolante infinita com 16 estilos
4. **Problema → Solução** — 6 dores em cards (links quebrados, qualidade ruim, desorganização, etc.) + transição "Chega disso."
5. **Benefícios (10 cards)** — grid premium, ícones, hover glow verde, animação on-scroll
6. **Estilos Musicais** — grid de chips/cards com hover scale
7. **Mockup feature** — screenshots do painel + bullets (Pesquisa inteligente, Player integrado, Downloads organizados)
8. **Prova social** — Stats grandes (100K+ músicas / 50K+ downloads/mês / 16+ estilos / 4.9★) + 6 depoimentos realistas (DJ, dono de paredão, criador, som automotivo)
9. **Planos** — cards premium (mantém lógica + filtro `slug !== "discografias"`, badge "MAIS VENDIDO" no semestral, "MELHOR CUSTO" no vitalício, glow verde no destaque)
10. **Garantia 7 dias** — selo grande + copy emocional
11. **FAQ** — accordion moderno
12. **CTA Final** — bloco gradient verde com headline de fechamento + CTA gigante + urgência
13. **Footer** — minimalista (mantém atual)

## Copy

- Headlines fortes, frases curtas, gatilhos de escassez/autoridade/praticidade/exclusividade
- Tom confiante, direto, profissional — sem soar golpe
- Otimizada para tráfego frio de Facebook/Instagram Ads

## Detalhes técnicos

- Mantém `useAuth`, redirect de logado, `useQuery` de planos, `PublicCheckoutDialog`, filtro discografias
- Novo `src/assets/hero-mockup.jpg` via `imagegen` (UI dark verde, mockup de painel de músicas)
- `framer-motion` com `whileInView` para fade/slide on scroll
- 100% tokens semânticos do design system

## Arquivos alterados

- `src/index.css` — tokens auxiliares + keyframes (sem alterar cores existentes)
- `tailwind.config.ts` — animações novas
- `src/pages/LandingPage.tsx` — reescrita completa preservando lógica
- `src/assets/hero-mockup.jpg` — gerar via imagegen

Aprovar para eu executar.