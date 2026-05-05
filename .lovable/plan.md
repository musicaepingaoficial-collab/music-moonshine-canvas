## Objetivo

Tornar o download de repertório (completo e por pasta) mais confiável, usando o tamanho real dos arquivos para dividir os ZIPs em o menor número possível de partes sem estourar limites do navegador / edge function.

## Diagnóstico

Hoje em `src/services/zipService.ts` + `RepertorioPage.tsx`:

- Cada parte ZIP é limitada a `300 MB` (passado em `maxZipBytes`) e até `180 IDs`.
- Se a música não tem `file_size` no banco, é estimada em `8 MB` fixo — gera partes mal calibradas (muitas pequenas ou uma estourando).
- Não há retry da parte inteira se a edge function falhar, e a barra de progresso é estimativa.
- Edge `download-archive` aceita até `500 arquivos` e `2 GB` por chamada, mas no cliente forçamos 300 MB (conservador).
- Sem feedback claro de tamanho total / nº de partes antes de iniciar; usuário não entende por que vêm vários ZIPs.

## Mudanças

### 1. Garantir `file_size` real para cada música

- No `useQuery` de `repertorio-musicas` em `RepertorioPage.tsx` já trazemos `musicas(*)`, então `file_size` está disponível. Onde estiver `0/null`, marcar como "desconhecido" e tratar separadamente (ver passo 3).
- Adicionar utilitário `getKnownAndUnknownSizes(musicas)` para somar bytes conhecidos e contar desconhecidos.

### 2. Mostrar resumo antes do download

- Em "Baixar tudo" e "Baixar pasta", abrir um pequeno diálogo de confirmação com:
  - Total de músicas
  - Tamanho total (ou "≈ X MB + N arquivos sem tamanho")
  - Nº estimado de ZIPs que serão gerados
  - Aviso: "Cada ZIP é baixado separadamente, extraia individualmente"
- Botão Confirmar / Cancelar.

### 3. Particionamento mais inteligente em `zipService.ts`

- Aumentar `DEFAULT_MAX_ZIP_BYTES` para `700 MB` (margem segura abaixo do limite de 2 GB do edge e confortável p/ navegador). Manter override por chamada.
- Para itens sem `file_size`:
  - Buscar em batch (RPC simples ou select já existente) e fallback para média dos itens conhecidos do mesmo repertório (em vez de 8 MB fixo).
- Adicionar `MIN_FILES_PER_PART = 1` e remover `MAX_IDS_PER_ZIP_PART` rígido (ou subir p/ 400) — deixar o limite ser por bytes, não por contagem, para gerar o mínimo de partes.
- Garantir que nenhum item ultrapasse o limite sozinho (se um arquivo > maxZipBytes, vira sua própria parte e loga aviso).

### 4. Retry e robustez no download de cada parte

- Em `downloadMultiple` (chama `download-archive`):
  - Adicionar retry automático (até 3x) com backoff em 408/429/5xx, similar ao já feito em `fetchDriveFileWithRetry`.
  - Em caso de falha definitiva de uma parte, continuar as demais e retornar a parte falhada na lista, em vez de abortar tudo.
- Em `downloadMultipleAsParts`:
  - Coletar partes que falharam e oferecer botão "Tentar novamente as partes que falharam" no toast/UI.

### 5. UI/UX no `RepertorioPage.tsx`

- Barra de progresso já existe; adicionar:
  - Texto "Parte X de Y — ~ZZ MB" usando soma de bytes da parte atual.
  - Após concluir: toast com nº de ZIPs, tamanho total real baixado e quais partes (se houver) falharam, com botão de retry.
- Botão "Baixar pasta" só aparece para pastas com músicas (já é o caso); incluir tooltip com tamanho da pasta.

### 6. Edge function `download-archive`

- Sem mudanças estruturais. Apenas confirmar:
  - Header `Content-Length` é enviado quando possível (para progresso real). Se não, manter estimativa.
  - Logar `bytesReceived` por arquivo para depurar futuros erros.

## Detalhes técnicos

- Arquivos tocados:
  - `src/services/zipService.ts` — particionamento, retry, novos tipos de retorno (`failedParts`).
  - `src/pages/RepertorioPage.tsx` — diálogo de confirmação, exibição de tamanho por parte, retry.
  - `src/components/ui/` — possível novo `ConfirmDownloadDialog` reutilizável.
  - `supabase/functions/download-archive/index.ts` — apenas pequenos ajustes de log/headers, sem mudança de schema.
- Sem alterações em banco / RLS.

## Fora de escopo

- Streaming progressivo real do ZIP (mantemos blob completo).
- Reorganização da estrutura de pastas/Drive.
