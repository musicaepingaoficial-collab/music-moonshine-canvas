## Problema

Quando o computador hiberna ou entra em modo de espera durante o download do repertório completo:
- As conexões com o Google Drive caem silenciosamente
- O `client-zip` continua "aguardando" os streams travados
- O usuário volta e o download parece travado em X% — mas nunca termina, e nenhum erro aparece
- Em alguns casos o ZIP final fica incompleto/corrompido sem aviso

## Solução proposta

Três camadas de proteção combinadas. Todas no frontend, sem mexer no backend.

### 1. Manter a tela ativa durante o download (Screen Wake Lock API)

Solicitar `navigator.wakeLock.request("screen")` ao iniciar o download e liberar ao terminar. Isso impede que a tela apague e, na maioria dos sistemas, evita que o navegador seja suspenso enquanto o download acontece. Funciona em Chrome/Edge/Opera (os mesmos que suportam o `showSaveFilePicker`).

Limitação honesta: o Wake Lock impede o monitor de apagar, mas se o usuário fechar a tampa do notebook ou o sistema operacional forçar hibernação por bateria, ele será suspenso de qualquer forma. Por isso precisamos das camadas 2 e 3.

### 2. Detectar travas (timeout por arquivo) e retomar automaticamente

Hoje, `fetchDriveStream` faz retry só na requisição inicial. Se a conexão cair *durante* o streaming de um MP3, o `reader.read()` fica pendurado para sempre.

Mudanças no `zipService.ts`:
- Envolver cada `reader.read()` num timeout (ex.: 60s sem receber bytes = considerar travado)
- Detectar evento `online`/`offline` do navegador e o evento `visibilitychange` (volta da hibernação)
- Quando detectar trava ou volta de suspensão: cancelar o stream atual, refazer o `fetchDriveStream` daquele arquivo, retomar do início **daquele arquivo** (não do ZIP inteiro — os arquivos já gravados no disco continuam intactos via File System Access API)

Como o `client-zip` precisa receber os arquivos em sequência para o índice central do ZIP, a retomada acontece *dentro* do `fetchOne` antes de entregar o arquivo ao gerador. Os arquivos já entregues e gravados não são afetados.

### 3. Aviso claro quando algo der errado + estado persistente

- Se o download falhar (timeout esgotado mesmo com retries, perda de conexão prolongada): mostrar toast de erro **explícito** com mensagem do tipo "Download interrompido — provavelmente o computador entrou em hibernação. Clique em Baixar novamente para tentar de novo."
- Adicionar listener `beforeunload` enquanto `downloading === true` para avisar o usuário se ele tentar fechar a aba
- Adicionar aviso visual na UI durante o download: pequeno texto "Mantenha esta aba aberta e o computador ligado até concluir."

## Arquivos a modificar

- `src/services/zipService.ts`
  - Adicionar Wake Lock (request/release no início e fim de `downloadMultiple`)
  - Envolver leitura do stream em timeout configurável (ex.: 60s)
  - Listener de `online`/`offline` e `visibilitychange` para forçar reset do stream travado
  - Retry com retomada do arquivo atual (até N tentativas) antes de marcar como falha
  - Diferenciar erros: "rede caiu", "tempo esgotado", "cancelado pelo usuário", "falhou após N tentativas"

- `src/pages/RepertorioPage.tsx`
  - Adicionar `beforeunload` listener enquanto `downloading`
  - Adicionar texto de aviso "Mantenha o computador ligado..." na barra de progresso
  - Mensagens de erro mais específicas (já vindas do service)

- `src/pages/CategoriaPage.tsx`
  - Mesmo aviso na UI durante o download (mesma função `runDownload`)

## Detalhes técnicos

- **Wake Lock**: `navigator.wakeLock.request("screen")` retorna um `WakeLockSentinel`. Re-solicitar no `visibilitychange` quando a aba voltar a ficar visível (o lock é liberado automaticamente quando a aba sai de foco).
- **Timeout do stream**: usar `Promise.race` entre `reader.read()` e um `setTimeout`. Se vencer o timeout, cancelar o reader e disparar retry.
- **Retomada por arquivo**: como cada arquivo é uma `Response` independente entregue ao `client-zip`, basta refazer o fetch daquele arquivo. Não dá para retomar bytes parciais de um stream interno do ZIP, então retomamos o arquivo inteiro (aceitável — arquivos médios de música, tipicamente 5–15 MB).
- **Persistir estado em localStorage**: descartado por enquanto. O ZIP em si não pode ser retomado entre recargas da página de forma confiável (o handle do `showSaveFilePicker` não persiste). Foco está em manter a sessão viva, não em retomar entre sessões.

## O que não vamos fazer (e por quê)

- **Não vamos implementar download verdadeiramente "resumível"** (continuar de onde parou após fechar o navegador): exigiria salvar handles de arquivo entre sessões (não suportado pelos browsers) ou refatorar pra Service Worker com IndexedDB, o que é grande demais para o problema relatado.
- **Não vamos mover para servidor dedicado**: o problema atual (hibernação local) afeta qualquer download em qualquer arquitetura. Manter no cliente continua sendo a melhor escolha.

## Resultado esperado

- ✅ Tela e processo se mantêm ativos enquanto o usuário não força hibernação
- ✅ Quedas curtas de conexão (ou retorno de sleep curto) são recuperadas automaticamente, arquivo por arquivo
- ✅ Travas longas geram **erro visível e acionável** em vez de silêncio
- ✅ Usuário vê aviso claro pedindo para manter o computador ligado
