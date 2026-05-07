## Objetivo

Ativar o disparo de eventos do Meta Pixel (client-side) e CAPI (server-side) em toda a aplicação, respeitando dinamicamente as configurações salvas em `pixel_settings` (Pixel ID, Access Token, e checkboxes de eventos ativos).

## Estado atual

- `pixel_settings` já é lida e persistida via `/admin/pixels`.
- `PixelInjector` já injeta o script do Meta Pixel quando `meta_enabled` + `meta_pixel_id` estão presentes, e respeita `page_view`.
- `src/lib/pixels.ts` já expõe `trackEvent()` e `usePixels()` que validam toggles antes de chamar `fbq`. **Nenhum componente do app chama esses helpers ainda** — é aí que entra a integração.
- O webhook `payment-webhook` já existe (Mercado Pago) e é o ponto natural para enviar `Purchase` via CAPI server-side.

## Mudanças

### 1. Tracking automático de rota (page_view)
Criar `src/components/pixels/RouteTracker.tsx` que escuta `useLocation()` e chama `trackEvent("page_view")` em cada mudança de rota. Montar dentro do `<BrowserRouter>` em `src/App.tsx` (junto ao `PixelInjector`). Remover o `PageView` automático do snippet inicial em `PixelInjector` para evitar duplicidade — o RouteTracker passa a ser a única fonte.

### 2. Eventos de UI (client-side `fbq`)

| Evento | Onde disparar |
|---|---|
| `view_content` | `LandingPage.tsx` (mount), `OfertasPage.tsx` (mount, com lista de planos), `PdfsPage.tsx` (mount) |
| `add_to_cart` | Clique em "Assinar agora" / "Comprar" em `OfertasPage`, `LandingPage` (CTA dos planos) e cards de PDF |
| `initiate_checkout` | Abertura do `CheckoutForm` / `PublicCheckoutDialog` (mount do dialog) |
| `add_payment_info` | Seleção de método (Pix/Crédito) dentro de `CheckoutForm.tsx` |
| `purchase` | Tela de sucesso do `CheckoutForm` (após `processTransparentPayment` aprovado ou Pix aprovado), enviando `value`, `currency: "BRL"`, `transaction_id` (= payment id, usado também como `event_id` para deduplicação com CAPI) |
| `lead` | Submit do formulário de captura na `LandingPage` (se houver) |
| `complete_registration` | Sucesso do cadastro em `LoginPage.tsx` / `CompleteProfilePage.tsx` |

Todos via `trackEvent(...)` — o helper já valida `meta_enabled` e `meta_events[*]`.

### 3. CAPI server-side (Conversions API)

Criar **edge function** `supabase/functions/meta-capi/index.ts`:
- POST `{ event_name, event_id, event_source_url, user_data: {email, phone, fbp, fbc, client_ip, client_user_agent}, custom_data: {value, currency, ...} }`
- Lê `meta_pixel_id` e `meta_access_token` de `pixel_settings`.
- Faz hash SHA-256 dos campos PII (`em`, `ph`) conforme exigido pela Meta.
- POST para `https://graph.facebook.com/v18.0/{pixel_id}/events?access_token=...`.
- Retorna `{ ok: true }` ou erro.
- CORS habilitado, `verify_jwt = false` (chamada também ocorre do webhook sem JWT).

**Pontos de chamada do CAPI:**
- **`payment-webhook`** (já existe): após confirmar pagamento aprovado, chamar `meta-capi` com `event_name: "Purchase"`, `event_id` = payment id (mesmo usado no client `trackEvent`), `value`, `currency`. Garante o evento mesmo se o usuário fechar a aba.
- **`CheckoutForm`** (client): após `purchase` no `fbq`, chamar `supabase.functions.invoke("meta-capi", {...})` para `Lead`/`InitiateCheckout` críticos opcionalmente — escopo inicial: só `Purchase` no webhook.

### 4. Helper compartilhado
Adicionar em `src/lib/pixels.ts` uma função `getFbCookies()` que extrai `_fbp` / `_fbc` do `document.cookie` para enriquecer payloads do CAPI (passada como `user_data` quando chamamos a edge function do client).

### 5. Limpeza
- Remover stub `__lovEnabledMetaEvents` do `PixelInjector` (não usado).
- Remover `PageView` automático do snippet inicial do Meta no `PixelInjector` (substituído pelo `RouteTracker`).

## Detalhes técnicos

- Toda leitura de settings no client passa por `usePixelSettings()` (cache via React Query) + `_setCachedPixelSettings` que `pixels.ts` já usa internamente — então `trackEvent()` funciona fora de hooks também.
- Deduplicação Meta: client e CAPI usam o **mesmo `event_id`** (= `transaction_id` para Purchase).
- Edge function não armazena nada — apenas relay para Graph API.
- Sem mudanças de schema no banco.

## Arquivos afetados

**Novos**
- `src/components/pixels/RouteTracker.tsx`
- `supabase/functions/meta-capi/index.ts`

**Editados**
- `src/App.tsx` (montar RouteTracker)
- `src/components/pixels/PixelInjector.tsx` (remover PageView inicial e stub)
- `src/lib/pixels.ts` (helper `getFbCookies`, opcional helper para invocar CAPI)
- `src/pages/LandingPage.tsx`, `src/pages/OfertasPage.tsx`, `src/pages/PdfsPage.tsx` (view_content + add_to_cart)
- `src/components/subscription/CheckoutForm.tsx`, `PublicCheckoutDialog.tsx` (initiate_checkout, add_payment_info, purchase)
- `src/pages/LoginPage.tsx` e/ou `CompleteProfilePage.tsx` (complete_registration)
- `supabase/functions/payment-webhook/index.ts` (chamar `meta-capi` em pagamento aprovado)
