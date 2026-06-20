# Plano: Conversão do Teste Grátis sem Sair do Sistema

## Objetivo
Quando o usuário em modo demo bate o limite (5 plays / tenta baixar / tenta entrar em área restrita), em vez de empurrá-lo para `/#planos` na landing, abrir um **popup persuasivo** dentro do próprio app que:

1. Mostra mensagem forte de copy.
2. Em seguida exibe os **2 planos (Mensal + Anual)** com o mesmo visual da página de vendas (dark mode, verde neon, ancoragem, badge "Mais Vendido", glow no Anual).
3. Ao escolher um plano, abre o `PublicCheckoutDialog` (já existente) no mesmo overlay — usuário finaliza sem sair da tela atual.
4. Totalmente responsivo (mobile-first, escala bem em tablet/desktop).

## Escopo
- **Editar** `src/components/demo/SignupGateDialog.tsx` — virar um popup com 2 etapas internas (mensagem → planos) e chamada inline ao checkout.
- **Não tocar** em `DemoModeContext`, gatilhos, `PublicCheckoutDialog`, banco. O gate continua sendo disparado pelos mesmos eventos.
- Reutilizar `PublicCheckoutDialog` para o checkout — sem duplicar lógica.
- Buscar planos do banco via `supabase.from("planos")` filtrando `slug in ('mensal','anual')` (preços, nome, descrição vêm do banco — coerente com a landing).

## Fluxo novo

```text
gate dispara (plays/download/private)
        │
        ▼
┌──────────────────────────────────────────┐
│  SignupGateDialog (open)                 │
│  step = "pitch"                          │
│  - ícone + título persuasivo             │
│  - copy de urgência                      │
│  - lista de benefícios                   │
│  - CTA: "Quero assinar agora"            │
│  - link: "Já tenho conta"                │
└──────────────────────────────────────────┘
        │ clique CTA
        ▼
┌──────────────────────────────────────────┐
│  step = "planos"                          │
│  - header curto: "Escolha seu plano"     │
│  - 2 cards (Mensal | Anual destacado)    │
│  - botão voltar                          │
└──────────────────────────────────────────┘
        │ clique em um card
        ▼
desativa sessão demo (deactivateDemo)
abre PublicCheckoutDialog (mesmo z-index)
fecha SignupGateDialog
```

## Mudanças detalhadas em `SignupGateDialog.tsx`

### 1. Estado interno
```ts
type Step = "pitch" | "planos";
const [step, setStep] = useState<Step>("pitch");
const [checkoutPlan, setCheckoutPlan] = useState<{slug:string;name:string;price:number} | null>(null);
```
Reset `step` para `"pitch"` toda vez que `gate.open` virar `true` (useEffect).

### 2. Query dos planos
```ts
const { data: planos } = useQuery({
  queryKey: ["gate-planos"],
  queryFn: async () => {
    const { data } = await supabase.from("planos" as any)
      .select("id, slug, name, price, description, duration_days")
      .in("slug", ["mensal", "anual"])
      .eq("active", true);
    return (data ?? []).sort((a:any,b:any) => a.slug === "mensal" ? -1 : 1);
  },
  enabled: gate.open,
  staleTime: 5 * 60 * 1000,
});
```

### 3. Step "pitch" (persuasivo)
- Ícone grande com `Crown` em círculo verde com `shadow-glow`.
- Título dinâmico mais forte conforme `reason`:
  - plays → "Sua demonstração acabou 🎵"
  - download → "Quase lá! Downloads liberados só para assinantes"
  - private → "Esta área é exclusiva para assinantes"
- Subtítulo persuasivo único: "Você já provou o sabor. Agora destrave **+100 mil músicas**, **packs completos** e **downloads ilimitados** por menos de **R$ 0,27 por dia** no plano anual."
- Lista de 4 bullets com `Check` verde (biblioteca, downloads, repertórios/PDFs, discografias).
- Caixa de prova social/garantia compacta: "✅ 7 dias de garantia incondicional".
- Botão CTA principal grande: `bg-gradient-cta shadow-glow h-12 text-base font-black` → "QUERO ASSINAR AGORA →" (avança para `"planos"`).
- Botão secundário ghost: "Já tenho conta" (mantém comportamento atual: `/login`).

### 4. Step "planos" (2 cards)
- Header compacto: botão `ArrowLeft` voltar para `"pitch"` + título "Escolha seu plano".
- Grid: `grid grid-cols-1 sm:grid-cols-2 gap-4`.
- Cada card replica visual reduzido da landing:
  - **Mensal**: borda padrão, preço `R$ 34,90 / mês`, 6 benefícios em check verde, botão outline verde.
  - **Anual** (destaque): `border-primary border-2 ring-2 ring-primary/40 shadow-glow-lg animate-glow-pulse`, badge `👑 MAIS VENDIDO` no topo (`bg-gradient-cta`), preço ancorado riscado `De R$ 418,80 por` + `R$ 97,00 / ano` em `text-4xl font-black`, lista igual + extra `👑 Discografias inclusas` em `text-primary`, botão CTA grande gradient.
- Texto pequeno no rodapé: "🔒 Pagamento seguro • Pix ou Cartão • Acesso liberado em segundos".

### 5. Seleção do plano → checkout inline
Ao clicar em "QUERO ESTE PLANO":
```ts
const handlePick = async (p) => {
  trackEvent("add_to_cart", { value:p.price, currency:"BRL", content_ids:[p.slug], content_name:p.name });
  setCheckoutPlan({ slug: p.slug, name: p.name, price: Number(p.price) });
  closeGate();
  await deactivateDemo(); // encerra sessão anônima para checkout aceitar email novo
};
```
Renderizar `<PublicCheckoutDialog open={!!checkoutPlan} onOpenChange={(o)=>!o && setCheckoutPlan(null)} plan={checkoutPlan}/>` no próprio componente. Isso garante que o checkout abre por cima sem navegação.

### 6. Responsividade
- `DialogContent` usa `max-w-md sm:max-w-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto`.
- Cards empilham em mobile (`grid-cols-1`), lado a lado em ≥640px.
- Tipografia: títulos `text-xl sm:text-2xl`, preços `text-3xl sm:text-4xl`.
- Espaçamentos: `space-y-4 sm:space-y-5`.
- Botões: `w-full` em todos os tamanhos, altura `h-11 sm:h-12`.
- Glow no Anual usa `animate-glow-pulse` (já em `index.css`).

### 7. Tokens / design system
- Apenas tokens semânticos: `text-primary`, `bg-gradient-cta`, `shadow-glow`, `shadow-glow-lg`, `border-primary`, `text-muted-foreground`, `bg-card/80 backdrop-blur`. Zero cor hardcoded.

## Pontos de atenção
- Mantém `closeGate()` no fechamento (X) — não força usuário, mas o copy + posicionamento facilita a conversão.
- O gate só fecha automaticamente ao escolher plano (`closeGate()` antes de abrir checkout).
- `deactivateDemo` é assíncrono — chamamos **depois** de setar `checkoutPlan` para evitar flicker (o dialog de checkout consegue abrir antes da sessão cair).
- Reutilizar `useQuery` evita refetch a cada gate.

## Validação
1. Abrir app em demo (sem conta).
2. Reproduzir 5 músicas → gate dispara → ver pitch persuasivo.
3. Clicar "Quero assinar agora" → ver 2 cards (Anual destacado).
4. Clicar Anual → `PublicCheckoutDialog` abre com plano correto, sem navegação de rota.
5. Repetir em viewport 375×667 (mobile): cards empilhados, tudo legível, scroll interno funciona.
6. Repetir gate por `download` e `private` → títulos mudam, restante igual.