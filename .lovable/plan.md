
# Plano: Aba "Rastreamento / UTMs" no Admin com URLs prontas para copiar

## Objetivo
Criar uma nova seção no menu do super admin onde você consiga copiar com 1 clique:
- URL da **página de vendas** (LandingPage `/`)
- URL do **checkout** (gate `/planos`, que abre o `PublicCheckoutDialog`)
- URL da **página de obrigado / pós-pagamento** (hoje o app redireciona para `/dashboard` após sucesso; vamos formalizar isso e deixar configurável)

A página já fica pronta para receber novos campos depois (parâmetros UTM padrão, IDs de plataformas externas, postbacks, etc.).

## O que vai mudar

### 1. Nova rota e item de menu
- Adicionar item **"Rastreamento"** (ícone `Link2` ou `Radar`) em `src/components/layout/AdminSidebar.tsx`, logo abaixo de "Pixels".
- Nova rota `/admin/rastreamento` em `src/App.tsx` → componente `AdminRastreamentoPage`.

### 2. Página `src/pages/admin/AdminRastreamentoPage.tsx`
Layout em cards:

```text
┌─ URLs principais ─────────────────────────────┐
│  Página de vendas      [https://.../]   [Copiar] │
│  Checkout / planos     [https://.../planos] [Copiar] │
│  Página pós-pagamento  [https://.../dashboard?status=success] [Copiar] │
└───────────────────────────────────────────────┘

┌─ URLs com UTM (gerador) ──────────────────────┐
│  Destino: [ select: vendas | checkout | obrigado ] │
│  utm_source   [______]                         │
│  utm_medium   [______]                         │
│  utm_campaign [______]                         │
│  utm_term     [______]                         │
│  utm_content  [______]                         │
│  Resultado:  [https://.../?utm_source=...] [Copiar] │
└───────────────────────────────────────────────┘

┌─ Integrações futuras (placeholder) ───────────┐
│  Postback URL (vamos preencher com a plataforma) │
│  Webhook de conversão                           │
└───────────────────────────────────────────────┘
```

Detalhes:
- Base URL = `window.location.origin` (funciona em preview, publicado e domínio próprio).
- Cada linha usa um botão `Copiar` que chama `navigator.clipboard.writeText(...)` + toast "URL copiada".
- Gerador de UTM monta a URL com `URLSearchParams`, ignorando campos vazios.

### 3. Página de obrigado / pós-pagamento
Hoje não existe uma página dedicada — o `PublicCheckoutDialog` apenas chama `navigate('/login?...')` após confirmar. Para integrar com plataforma de UTMs precisamos de uma URL estável e pública.

Opção escolhida (mais simples e segura):
- Usar `/dashboard?status=success` como **URL de obrigado oficial** (sem criar página nova).
- Quando o `payment-webhook` confirmar pagamento, o front já leva o usuário para `/dashboard`. Adicionar `?status=success&plano=<slug>` ao redirect para que a plataforma de UTMs detecte a conversão via parâmetro.
- Disparar evento de conversão (Meta/GA já existentes em `pixels.ts`) somente quando esse parâmetro estiver presente, evitando duplicações.

Se você preferir uma página dedicada `/obrigado`, eu crio — só me avise. Por padrão sigo com `/dashboard?status=success`.

### 4. Sem mudanças no banco
Nada de tabela nova nesta etapa — todas as URLs derivam do `origin` + rotas existentes. Quando você quiser salvar configurações de rastreamento (IDs externos, postbacks), criamos `tracking_settings` numa próxima iteração.

## Detalhes técnicos
- Arquivos novos: `src/pages/admin/AdminRastreamentoPage.tsx`.
- Arquivos alterados: `src/App.tsx` (rota + lazy import), `src/components/layout/AdminSidebar.tsx` (item de menu), `src/components/subscription/PublicCheckoutDialog.tsx` (adicionar `?status=success&plano=...` no redirect pós-pagamento).
- Sem dependências novas. Componentes shadcn já existentes (`Card`, `Input`, `Button`, `Select`, `Label`).
- Acesso protegido pela `AdminRoute` existente.

## Validação
1. `/admin/rastreamento` aparece no menu, abre a página, mostra as 3 URLs com `origin` correto.
2. Botão Copiar coloca a URL na área de transferência e dispara toast.
3. Gerador de UTM produz URL válida e copiável.
4. Após pagamento aprovado, o usuário cai em `/dashboard?status=success&plano=<slug>` (visível na barra de endereço).

Aprovando, eu implemento.
