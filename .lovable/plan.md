
# Análise: o Meta Pixel está enviando tudo que deveria?

## Resumo do diagnóstico

A integração tem 2 lados: **Pixel no navegador** (`fbq`) e **Conversions API** (edge function `meta-capi`). Os dois funcionam, mas há **lacunas importantes** que reduzem a qualidade de matching no Meta e podem fazer eventos não atribuírem.

### O que JÁ está OK

- `fbq('init', PIXEL_ID)` + `PageView` automático por rota (`RouteTracker`).
- Eventos disparados nos pontos certos: `ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Purchase`, `CompleteRegistration`.
- `value`, `currency`, `content_ids`, `content_name` enviados nos eventos comerciais.
- CAPI envia `_fbp`, `_fbc`, `client_user_agent`, hash SHA-256 de email/phone/external_id.
- `event_id` casado entre Pixel e CAPI no `Purchase` (deduplicação correta).
- Consentimento (LGPD) respeitado antes de disparar.

### O que está FALTANDO ou ERRADO (impacto real)

1. **Advanced Matching no Pixel browser não está ativo.**
   - `fbq('init', id)` é chamado **sem o 2º parâmetro** com `{em, ph, external_id, fn, ln}`. O Meta usa Advanced Matching para casar eventos do navegador a contas; sem isso, o EMQ (Event Match Quality) cai muito.
   - Hoje o email/phone do usuário logado nunca é passado para o `fbq`.

2. **Sem `event_id` na maioria dos eventos** (só `Purchase` tem).
   - `InitiateCheckout`, `AddPaymentInfo`, `Lead`, `CompleteRegistration`, `ViewContent`, `AddToCart` disparam **sem `eventID`**, então quando você quiser duplicar via CAPI vai ter **eventos duplicados** (atribuição inflada).

3. **CAPI só é chamada em `Purchase` e `CompleteRegistration`.**
   - Faltam chamadas CAPI para `InitiateCheckout`, `AddPaymentInfo`, `ViewContent`, `AddToCart`, `Lead`, `PageView`. Bloqueadores de anúncio / iOS / Safari ITP cortam o Pixel — sem CAPI espelhada, esses eventos somem.

4. **`client_ip_address` não é enviado para a CAPI.**
   - A edge function lê `body.user_data.client_ip_address`, mas o frontend nunca preenche. O IP deveria vir do header da requisição na edge (`x-forwarded-for` / `req.headers.get("x-real-ip")`) — hoje não é extraído.

5. **`fbc` montado a partir de `?fbclid=` não está sendo gravado.**
   - Quando o usuário chega via anúncio, o cookie `_fbc` só é criado pelo Pixel **se ele já carregou antes** da navegação. Não há fallback que grave `_fbc = fb.1.{ts}.{fbclid}` manualmente a partir da query string. Resultado: usuários com adblock light ou primeira visita perdem o `fbc`.

6. **Falta hash de dados adicionais úteis** no CAPI:
   - `fn` (first name), `ln` (last name), `ct` (city), `st` (state), `zp` (zip), `country`, `db` (date of birth) — qualquer um aumenta EMQ. Hoje só `em`, `ph`, `external_id`.

7. **`external_id` quase nunca é enviado.**
   - Em `Purchase` e `CompleteRegistration`, deveria mandar o `user.id` do Supabase como `external_id` (hashed) — isso casa visitantes anônimos com usuários logados em sessões diferentes. Hoje só é enviado `email` e `phone`.

8. **`PageView` server-side não existe.**
   - Sem `PageView` na CAPI, qualquer navegação com adblock fica invisível para o Meta, prejudicando otimização de campanhas TOFU.

9. **`AddToCart` na LandingPage e Ofertas** dispara com `value` correto mas sem `event_id` e sem CAPI espelhada.

10. **`Lead`** (formulários, contato) nunca é disparado em nenhum lugar do app.

11. **`content_type: "product"` sempre fixo.**
    - Para planos de assinatura o ideal é `content_type: "product_group"` ou enviar `contents: [{ id, quantity, item_price }]` no padrão DPA. Sem isso, catálogos do Meta não casam.

12. **CAPI não loga em tabela de auditoria** — quando o Meta responde com aviso (ex.: `fbtrace_id`, `events_received: 0`), nada fica gravado, dificultando debug.

13. **`test_event_code`** existe na função mas não há UI no `/admin/pixels` para configurar/usar — então não dá pra testar no "Test Events" do Meta sem editar código.

---

## Plano de correção (em 4 etapas)

### Etapa 1 — Maximizar matching no Pixel browser (alta prioridade, baixo risco)

**Arquivos:** `src/components/pixels/PixelInjector.tsx`, novo `src/hooks/useFbAdvancedMatching.ts`.

- Buscar `auth.getUser()` + perfil (email, telefone, nome) e re-inicializar o pixel com Advanced Matching quando o usuário logar:
  ```
  fbq('init', PIXEL_ID, { em, ph, external_id, fn, ln });
  ```
- Re-init após logout (limpar matching).
- Capturar `?fbclid=` na primeira visita e gravar cookie `_fbc` manualmente (`fb.1.{Date.now()}.{fbclid}`) com `Max-Age` de 90 dias, antes do Pixel carregar.

### Etapa 2 — Deduplicação Pixel ↔ CAPI em TODOS os eventos

**Arquivos:** `src/lib/pixels.ts`.

- Gerar `event_id` (UUID v4) **uma única vez** por evento dentro de `dispatchEvent`, antes de chamar `fbq` e antes de chamar `sendCapi`.
- Sempre passar `eventID` no 4º parâmetro do `fbq('track', ...)`.
- Refatorar para que `trackEvent(...)` opcionalmente já dispare a CAPI espelhada (flag `capi: true` por padrão para eventos de conversão).

### Etapa 3 — Cobertura da CAPI

**Arquivos:** `src/lib/pixels.ts`, `supabase/functions/meta-capi/index.ts`, todos os call sites de `trackEvent`.

- Espelhar via CAPI: `ViewContent`, `AddToCart`, `InitiateCheckout`, `AddPaymentInfo`, `Lead`, `CompleteRegistration`, `Purchase` (já tem), e opcionalmente `PageView`.
- Na edge function, extrair `client_ip_address` do header (`x-forwarded-for` primeiro IP, fallback `x-real-ip`) e injetar no `user_data` automaticamente.
- Aceitar e hashear `fn`, `ln`, `ct`, `st`, `zp`, `country`, `db`, `external_id` quando o frontend mandar.
- Sempre incluir `external_id = supabase user.id` quando houver sessão.
- Adicionar tabela `meta_capi_logs` (event_name, event_id, status, fbtrace_id, response_json, created_at) e gravar resposta do Graph API para auditoria. RLS: só admin lê.

### Etapa 4 — Qualidade do payload + ferramentas

**Arquivos:** `src/lib/pixels.ts`, `src/pages/admin/AdminPixelsPage.tsx`.

- Padronizar payload de planos:
  ```
  content_type: "product",
  contents: [{ id: plan.slug, quantity: 1, item_price: plan.price }],
  num_items: 1
  ```
- Adicionar campo "Test Event Code" no `/admin/pixels` que é passado para a edge function só durante testes.
- Adicionar evento `Lead` em pontos relevantes (popup de WhatsApp, formulário de contato, se houver).

---

## Detalhes técnicos

- **Advanced Matching keys aceitas pelo Meta:** `em, ph, fn, ln, db, ge, ct, st, zp, country, external_id, client_ip_address, client_user_agent, fbc, fbp`. Todas (exceto `fbc/fbp/ip/ua`) devem ser **SHA-256 hex lowercase trimmed**. No browser, `fbq` faz o hash sozinho — basta passar texto.
- **`event_id`:** deve ser **string idêntica** no Pixel e na CAPI; usar `crypto.randomUUID()`.
- **`_fbc` cookie format:** `fb.{subdomain_index}.{creation_timestamp_ms}.{fbclid}`. Para `.dominio.com` use `subdomain_index = 1`.
- **IP na edge:** Deno `req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()`.
- **Deduplicação Meta:** Meta deduplica por `(event_name + event_id)` numa janela de 7 dias. Sem `event_id`, duplica.
- **PII:** nenhum dado não-hasheado pode sair do servidor para o Graph API; tudo continua passando pela edge function existente.

---

## Impacto esperado

- EMQ (Event Match Quality) do Meta deve subir de "Baixo/Médio" para **"Bom/Excelente"** (7-10).
- Eventos recuperados de usuários com adblock/iOS via CAPI: tipicamente **+15% a +40%** de volume reportado.
- Atribuição de Purchase mais confiável (sem duplicação inflada).
- Catálogo dinâmico (DPA) começa a funcionar com `contents` padronizado.

---

## O que NÃO vou mexer

- Lógica de pagamento e Mercado Pago — fora do escopo.
- Outros pixels (GA4, TikTok, Kwai, Google Ads) — só Meta nesta rodada.
- Consentimento LGPD — já está correto.

Confirma que posso seguir com as 4 etapas? Se quiser priorizar (ex.: só Etapa 1 + 2 agora), me diga.
