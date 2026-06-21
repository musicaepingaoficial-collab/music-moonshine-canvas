# Plano: Avisos de teste ficam atrás do player no mobile

## Diagnóstico
O player de música está fixo com `z-[60]` (`MusicPlayer.tsx` linha 112), mas os diálogos do Radix usam o padrão `z-50` (`ui/dialog.tsx` linhas 22 e 40). No celular o player ocupa a base da tela e acaba ficando **na frente** do overlay e do conteúdo dos diálogos de aviso ("Faltam só X músicas", "Termine seu cadastro / veja os planos"), escondendo o botão CTA e dificultando a assinatura.

Componentes afetados pelo mesmo problema:
- `DemoWarningDialog` (aviso 3 de 5)
- `SignupGateDialog` (gate ao tentar tocar/baixar)
- `SubscriptionDialog` (escolha de plano + checkout)
- `DemoBanner` (sticky com `z-40`, também fica abaixo do player — apenas no topo, sem conflito direto, mas vale revisar)

## Mudanças

### 1. `src/components/demo/DemoWarningDialog.tsx`
No `<DialogContent>` adicionar classes para subir acima do player e dar respiro do fundo no mobile:
- Acrescentar `z-[80]` e `mb-[calc(env(safe-area-inset-bottom)+96px)] sm:mb-0` no `className`.
- No `DialogOverlay` (vem do componente base) já será coberto pela mudança global abaixo.

### 2. `src/components/demo/SignupGateDialog.tsx`
Mesmo tratamento: `z-[80]` no `DialogContent` e margem inferior no mobile para o conteúdo nunca encostar/ser encoberto pelo player.

### 3. `src/components/subscription/SubscriptionDialog.tsx`
Adicionar `z-[80]` e `max-h-[calc(100dvh-96px)] overflow-y-auto mb-[calc(env(safe-area-inset-bottom)+96px)] sm:mb-0` no `DialogContent` (já tem `max-w-2xl`), garantindo que em telas pequenas o card de planos role e o botão "Assinar" fique sempre visível acima do player.

### 4. `src/components/ui/dialog.tsx` (ajuste global)
Para garantir que o overlay escuro também cubra o player:
- `DialogOverlay`: trocar `z-50` por `z-[75]`.
- `DialogContent`: trocar `z-50` por `z-[80]`.

Isso resolve o problema para **todos** os diálogos do app (modais de admin, checkout, etc.) sem precisar tocar em cada um. Como o player é `z-[60]` e os popovers do player são `z-[70]`, a hierarquia final fica:
- Player bar: 60
- Popovers internos do player (fila/queue): 70
- Overlay de diálogo: 75
- Conteúdo de diálogo: 80

### 5. `src/components/demo/DemoBanner.tsx` (opcional / leve)
Banner fica no topo (`top-0`), sem conflito com o player. Manter `z-40`. Sem mudança.

## Validação
1. Abrir preview em viewport mobile.
2. Logar como usuário em modo demo e tocar 3 músicas até disparar `DemoWarningDialog` — confirmar que o botão "QUERO OUVIR ILIMITADO" aparece acima do player.
3. Tocar a 6ª música para abrir `SignupGateDialog` — confirmar CTA visível.
4. Clicar em "Assinar agora" no banner → `SubscriptionDialog` rola e mostra o botão "Assinar" de cada plano sem ser encoberto.
5. Repetir em desktop para garantir que nada quebrou.

## Detalhes técnicos
- Uso de `env(safe-area-inset-bottom)` cobre iPhones com notch.
- `100dvh` evita o bug da barra de endereço do Safari mobile.
- Alterar o z-index global do Dialog é seguro porque o único elemento da app acima de 50 é o próprio player (60/70), que precisamos cobrir.
