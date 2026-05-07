# Discografias inclusas nos planos Vitalício e Anual

## Objetivo
- Na página de vendas (LandingPage e OfertasPage) **não** oferecer o módulo Discografias como item separado.
- Comunicar claramente que **Discografias está incluída nos planos Vitalício e Anual**.
- Quem assinar Mensal ou Semestral continua podendo comprar o módulo avulso, mas **somente dentro do sistema** (página `/discografias`, como já é hoje).

## Mudanças

### 1. Regra de acesso (`src/hooks/useUser.ts`)
Atualizar `useHasActiveSubscription`:
- Hoje: `hasDiscografiasAccess = admin || vitalicio || profile.has_discografias`.
- Novo: incluir também o plano **anual** → `admin || vitalicio || anual || profile.has_discografias`.

Assim, usuários do plano Anual entram direto em `/discografias` sem precisar comprar o módulo.

### 2. Página de vendas pública (`src/pages/LandingPage.tsx`)
Na seção de planos, adicionar o item de feature **"Discografias completas inclusas"** (com destaque visual estilo "bônus") apenas nos cards cujo `slug` seja `vitalicio` ou `anual`. Os cards `mensal` e `semestral` não exibem nenhuma menção a Discografias (nem como upsell).

Sem alterações no resto da landing.

### 3. Página de planos logada (`src/pages/OfertasPage.tsx`)
Mesma lógica: dentro do `<ul>` de features de cada plano, adicionar
"Discografias completas inclusas" apenas quando `plano.slug` for `vitalicio` ou `anual`.

### 4. Página de Discografias (`src/pages/DiscografiasPage.tsx`)
No bloco de "Módulo Bloqueado":
- Atualizar o texto: "disponível nos planos **Vitalício** e **Anual**, ou pode ser adquirido separadamente".
- Botão "Ver Planos" leva para `/ofertas` (mantém).
- Botão "Comprar módulo" (já existente) continua disponível para os usuários autenticados que não tiverem plano Vitalício/Anual.

Esse botão de compra avulsa **continua existindo apenas aqui, dentro do sistema**, atendendo ao requisito de que mensal/semestral compre por dentro.

## Observação técnica
Nenhuma mudança de schema. O webhook (`payment-webhook`) já liga `has_discografias = true` para a compra avulsa. O acesso por plano Anual é checado em runtime através do slug da assinatura ativa.
