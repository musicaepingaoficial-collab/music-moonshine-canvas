# Plano: corrigir Configurações + visualizar destinatários

## Diagnóstico

Verifiquei o banco e a configuração existe (`recovery_campaign_config.id='default'`, `enabled=true`, textos preenchidos). Então a aba **Configuração** aparecer vazia tem 2 causas prováveis:

1. **A edge function `recovery-campaign-admin` nunca foi chamada com sucesso** (sem logs). Ela usa `corsHeadersFor` de `_shared/cors.ts`, mas o resto do projeto usa o padrão `corsHeaders` direto — possível erro silencioso de import/CORS fazendo o `supabase.functions.invoke` falhar antes de chegar ao backend.
2. **Autorização**: a função exige Bearer token de admin. Se o token não está sendo enviado (invoke do SDK envia), retorna 401 e o React Query mostra tudo vazio sem feedback.

A aba **Destinatários** também depende da mesma função, então cai no mesmo problema.

## O que vou fazer

### 1. Robustecer a edge function `recovery-campaign-admin`
- Trocar `corsHeadersFor` por CORS inline padrão (mesmo padrão das outras functions do projeto), garantindo que não há erro de import.
- Logar cada `action` recebida + user.id no início (debug rápido via Edge logs).
- Retornar erro 401 explícito com `reason` ("missing token" | "not admin") em vez de só "Unauthorized".

### 2. Mostrar feedback no frontend quando a config/lista falhar
- Em `AdminRecuperacaoPage`, exibir mensagem de erro (vermelha) quando `cfgQ.isError`, `statsQ.isError`, etc., com o `error.message` — hoje silenciosamente mostra vazio.
- Skeleton/loader nas abas enquanto carrega.

### 3. Melhorar a aba **Destinatários** ("para quem vai ser enviado")
Hoje só lista o `recovery_campaign_log` (quem já recebeu). Vou separar em dois blocos claros:

**Bloco A — "Vão receber na próxima execução"** (já existe como "Próximos envios", vou mover/duplicar pra ficar visível também em Destinatários):
- Tabela com Nome, Email, Step a ser enviado, Motivo, Data prevista de envio.
- Contador total no topo + botão **"Exportar CSV"**.
- Botão **"Disparar agora"** para essa lista.

**Bloco B — "Já receberam"** (atual tabela), mantida com os filtros existentes (step, status, busca por email).

### 4. Aumentar limite da prévia de elegíveis
- Hoje `eligible` retorna apenas 200 (`rows.slice(0, 200)`). Vou paginar e retornar `total` real, mostrando "X usuários no total, exibindo primeiros 200".
- Adicionar filtro por step (1/2/3) na aba.

### 5. Verificação final
- Após o deploy, chamar `recovery-campaign-admin` via `curl_edge_functions` com `get_config`, `eligible` e `stats` para confirmar que retornam dados.
- Verificar logs da função.

## Arquivos afetados
- `supabase/functions/recovery-campaign-admin/index.ts` — CORS, logs, paginação de eligible.
- `src/pages/admin/AdminRecuperacaoPage.tsx` — tratamento de erro, skeleton, aba Destinatários reorganizada, export CSV.

## Fora do escopo
- Mudanças no envio (`send-recovery-emails`) e no schema do banco — está tudo correto e populado.
