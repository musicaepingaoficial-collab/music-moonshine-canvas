# Plano para impedir o aviso em usuários Vitalício

## Do I know what the issue is?

Sim. O problema não está mais nas duplicatas de assinatura nem no carrossel principal corrigido antes. O aviso da imagem é o componente `AdBanner` exibido no topo do dashboard, antes do `HeroCarousel`.

Esse componente busca o primeiro registro ativo de `anuncios` e mostra direto, sem consultar a assinatura do usuário e sem aplicar `include_plan_slugs` / `exclude_plan_slugs`. Por isso o banner “Super Promoção !” continua aparecendo mesmo quando o usuário está como `Vitalício`.

## Problema exato

No banco, o anúncio está configurado corretamente:

- Mostrar somente para: `mensal`, `trimestral`, `anual`
- Ocultar para: `vitalicio`

Mas o componente do topo do dashboard ignora esses campos:

```text
DashboardPage
  AdBanner position="top"     <- aviso pequeno da imagem, sem filtro de plano
  HeroCarousel                <- carrossel grande, já com filtro de plano
```

O `HeroCarousel` já usa `useAssinatura` e aplica os filtros. O `AdBanner` ainda não.

## Mudanças planejadas

### 1. Corrigir `src/components/ads/AdBanner.tsx`

Adicionar a mesma lógica de assinatura usada nos outros banners:

- Carregar usuário com `useAuth()`.
- Carregar assinatura com `useAssinatura(user?.id)`.
- Identificar o plano atual apenas se a assinatura estiver ativa e não expirada.
- Aplicar `exclude_plan_slugs`:
  - se o plano atual estiver na lista de exclusão, o anúncio não aparece.
- Aplicar `include_plan_slugs`:
  - se a lista tiver planos e o usuário não estiver em um deles, o anúncio não aparece.
- Enquanto a assinatura estiver carregando, não renderizar o aviso, para evitar aparecer por alguns segundos antes do filtro ser calculado.

### 2. Ajustar a busca de anúncios do topo

Hoje o `AdBanner` pega apenas o primeiro anúncio ativo com `.limit(1)`. Isso pode esconder todos os anúncios se o primeiro for excluído para o plano atual.

Alterar para:

- Buscar os anúncios ativos ordenados por `position` e `created_at`.
- Filtrar no frontend conforme o plano do usuário.
- Mostrar o primeiro anúncio elegível.

Assim, se existir um banner específico para Vitalício no futuro, ele poderá aparecer; o banner de promoção de Vitalício continuará bloqueado para quem já é Vitalício.

### 3. Reutilizar a regra para evitar novo erro

Criar uma função pequena no próprio `AdBanner.tsx` ou em um utilitário compartilhado, se fizer sentido, para padronizar:

```text
anúncio visível quando:
  plano atual NÃO está em exclude_plan_slugs
  E, se include_plan_slugs tiver itens, plano atual está em include_plan_slugs
```

Manter a mudança pequena e focada para não alterar outras áreas sem necessidade.

### 4. Não mexer no banco agora

Não é necessário alterar dados nem criar nova migration para resolver este caso, porque:

- O anúncio já está configurado corretamente.
- As assinaturas Vitalício já aparecem corretamente no banco.
- O erro está no componente que renderiza o aviso no dashboard.

## Arquivos que serão alterados

- `src/components/ads/AdBanner.tsx`

## Validação após aplicar

1. Usuário `Vitalício`:
   - O aviso “Super Promoção !” do topo do dashboard não aparece.
   - O selo `Vitalício` continua aparecendo no topo da tela.

2. Usuário `mensal`, `trimestral` ou `anual`:
   - O aviso pode aparecer normalmente, porque está incluído para esses planos.

3. Usuário sem assinatura ativa:
   - O aviso não aparece se o anúncio tiver `include_plan_slugs` preenchido.

4. Banco:
   - Nenhuma alteração de dados é necessária.
   - A configuração atual do anúncio continua sendo respeitada.

## Resultado esperado

Depois da implementação, o banner/aviso da imagem deixará de aparecer para todos os usuários com plano `vitalicio`, inclusive no topo do dashboard.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>