## Objetivo

Eliminar definitivamente os erros de "arquivo corrompido" e a divisão em várias partes ao baixar o repertório, movendo a geração do ZIP do servidor (Supabase Edge Function) para o navegador do usuário.

## Por que isso resolve o problema

Hoje, o servidor Edge Function do Supabase faz:
1. Baixa cada música do Google Drive
2. Junta tudo num ZIP
3. Envia o ZIP para o navegador

O passo 2 estoura o limite de CPU do servidor (~400ms), o que corta o ZIP no meio e gera arquivos corrompidos. Por isso era necessário dividir em várias partes pequenas.

Com a nova abordagem:
1. O servidor só gera URLs assinadas para cada música (operação de milissegundos, sem limite)
2. O navegador baixa cada música e monta o ZIP localmente, em streaming
3. O ZIP nunca é cortado — é escrito diretamente no disco do usuário enquanto baixa

## Mudanças propostas

### 1. Nova Edge Function `download-urls`
Substitui a `download-archive`. Recebe a lista de IDs de músicas e devolve, para cada uma:
- `fileName` (nome final dentro do ZIP, com pasta/subpasta)
- `signedUrl` (URL temporária do Google Drive, válida por ~1h)
- `size` (tamanho em bytes)

Faz toda a validação atual (autenticação, assinatura ativa, plano trial, rate limit, registro em `downloads`), mas **não baixa nem empacota nada** — operação leve e instantânea.

### 2. Reescrita do `src/services/zipService.ts`
- Adicionar a biblioteca `client-zip` (~3kb, sem dependências, suporta streaming nativo via `File System Access API` e fallback para Blob)
- Função `downloadMultiple` passa a:
  1. Pedir URLs assinadas à nova Edge Function
  2. Tentar usar `showSaveFilePicker` (Chrome/Edge/Opera) → escreve o ZIP direto no disco, consumo de RAM mínimo, suporta arquivos de qualquer tamanho
  3. Fallback para Blob em memória (Firefox/Safari) — funciona até ~2GB
  4. Baixar as músicas em paralelo controlado (3-4 simultâneas) com retry automático
  5. Mostrar progresso real (arquivo X de Y, MB baixados)
- Remover a lógica de divisão em partes (`downloadMultipleAsParts`, `splitItemsIntoZipParts`, `planZipParts`, `buildPartArchiveName`)

### 3. Atualizar telas que usam download
- `src/pages/RepertorioPage.tsx`: remover avisos de "será dividido em N partes" e barra de progresso por parte. Mostrar apenas progresso global ("Baixando 12 de 80 — 45 MB")
- `src/pages/CategoriaPage.tsx` e `src/pages/MusicaPage.tsx`: ajustar chamadas se necessário
- `src/components/music/MusicCard.tsx`: sem mudança (já usa `downloadSingle`)

### 4. Remover código antigo
- Deletar `supabase/functions/download-archive/index.ts` (não será mais usado)
- Manter `supabase/functions/download/index.ts` e `google-drive/index.ts` (ainda servem para download individual e streaming de áudio)

## Detalhes técnicos

**Biblioteca escolhida:** `client-zip` (https://github.com/Touffy/client-zip)
- Suporta `ReadableStream` como entrada → o navegador faz streaming do Drive direto para o ZIP sem carregar tudo em RAM
- Compatível com `File System Access API` para escrita direta em disco
- Sem compressão (level 0), igual ao atual — áudio MP3 já é comprimido

**Concorrência:** baixar 3-4 músicas em paralelo com `Promise` controlado, para não sobrecarregar nem o Drive nem a conexão do usuário.

**Fallback de navegador:** browsers sem `showSaveFilePicker` (Firefox, Safari) usam Blob em memória — limite prático de ~2GB, suficiente para repertórios mensais. Se o usuário tentar algo maior nesses browsers, mostrar aviso para usar Chrome/Edge.

**Segurança:** as URLs assinadas do Google Drive são geradas usando o mesmo `service account` atual e expiram em 1h. Mesma validação de assinatura/plano que existe hoje.

**Registro de downloads:** continua sendo feito no servidor, na hora de gerar as URLs assinadas (igual hoje).

## Resultado esperado

- ✅ Repertório completo baixa em **um único arquivo ZIP**
- ✅ Sem erros de corrupção (nunca mais)
- ✅ Sem limite de tamanho prático (Chrome/Edge)
- ✅ Mais rápido (paralelismo + sem intermediário no servidor)
- ✅ Custo zero de servidor
- ✅ Funciona com a infraestrutura atual (Google Drive + Supabase)
