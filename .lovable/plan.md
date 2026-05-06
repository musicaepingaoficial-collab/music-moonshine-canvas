## Diagnóstico

O navegador exige que `showSaveFilePicker()` seja chamado **diretamente dentro de um gesto do usuário** (clique). Hoje, em `downloadMultiple`, o picker só é chamado depois de vários `await` (sessão Supabase, wake lock, lote de URLs do edge function `download`). Esses `await` invalidam a "user activation", então o Chrome lança `SecurityError` (não `AbortError`).

No código atual, qualquer erro diferente de `AbortError` cai no `catch` silenciosamente e seta `writableStream = null`, indo para o fallback em memória. Resultado:

1. O diálogo "Salvar como…" nunca aparece.
2. O fallback monta o ZIP em memória e tenta `anchor.click()`. Para repertórios grandes, isso pode estourar memória ou ser bloqueado pelo Chrome (download sem gesto recente), e o arquivo nunca aparece em Downloads.

Por isso o usuário vê o progresso terminar, mas nenhum arquivo é salvo.

## Solução

Abrir o `showSaveFilePicker()` **antes** de qualquer `await`, no próprio handler do clique, e passar o handle pronto para o serviço.

### Mudanças

**`src/services/zipService.ts`**
- Exportar uma função utilitária `pickZipDestination(suggestedName)` que chama `showSaveFilePicker` (ou retorna `null` se o navegador não suportar). Essa função fica isolada para ser chamada imediatamente no clique.
- Alterar a assinatura de `downloadMultiple` para aceitar um `fileHandle?` opcional já obtido do picker. Se vier handle, usa direto; se não vier e o navegador não tem File System Access, cai no fallback de blob.
- Remover o `showSaveFilePicker` de dentro de `downloadMultiple`.
- Melhorar o fallback em memória: avisar via toast quando o ZIP for grande demais, e logar erros do `anchor.click()` em vez de engolir.
- Diferenciar `AbortError` (cancelamento) de outros erros do picker — outros erros viram toast explícito ("Não foi possível abrir o seletor de arquivo. Tente clicar em Baixar novamente.") em vez de silêncio.

**`src/pages/RepertorioPage.tsx` e `src/pages/CategoriaPage.tsx`**
- No `runDownload`, **antes** de qualquer `await` ou `setState` assíncrono, chamar `pickZipDestination(name)` sincronamente a partir do clique. Se o usuário cancelar, abortar sem mostrar erro. Se o handle vier, repassar para `downloadMultiple`.
- Garantir que o handler do botão "Baixar" continue sendo um clique direto (não dentro de um `setTimeout` ou `Promise.then` que quebraria a user activation).

### Detalhe técnico do fluxo correto

```text
clique no botão Baixar
  └─ pickZipDestination(name)            ← gesto do usuário ainda válido
      ├─ usuário escolhe pasta → handle
      └─ usuário cancela → return
  └─ await downloadMultiple(ids, name, onProgress, handle)
      ├─ usa handle.createWritable() direto
      └─ stream do ZIP vai pro disco sem passar pela RAM
```

### Fora do escopo

- Não vamos mudar a lógica de retry, wake lock ou timeout — só o ponto onde o picker é aberto e o tratamento de erro do fallback.
