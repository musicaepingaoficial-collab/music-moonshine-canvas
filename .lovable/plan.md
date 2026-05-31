## Importação em massa de discografias do packdemusicas.com.br

### Fluxo combinado

1. Você acessa cada aba de gênero no site (Forró, Sertanejo, Pagode, etc.), abre o Console (F12) e roda o script de extração ajustado abaixo — ele já marca o gênero correto.
2. Envia 1 arquivo `.json` por gênero aqui no chat.
3. Eu rodo um script de importação que:
   - **Agrupa por artista** — vários "Parte 01/02" do mesmo artista viram 1 card único com múltiplos botões de download.
   - **Baixa cada capa** de `packdemusicas.com.br` e faz upload pro bucket `discografias` do seu Supabase (URL pública estável).
   - **Insere na tabela `discografias`** com `artista_nome`, `genero`, `imagem_url` (do bucket) e `links` (jsonb com todos os MediaFire daquele artista).
   - Faz **dedupe**: se o mesmo artista já existir no banco (mesmo nome + mesmo gênero), faz `update` adicionando links novos em vez de duplicar.
4. Ao final, reporto: total de artistas importados, links adicionados e imagens enviadas.

### Script ajustado para você rodar no Console (por gênero)

```javascript
// Mude "FORRÓ" pelo nome do gênero da aba atual antes de rodar
const GENERO = "FORRÓ";

const dados = Array.from(document.querySelectorAll('.carddiscos')).map(card => ({
  nome: card.querySelector('h3')?.innerText?.trim(),
  imagem: card.querySelector('img')?.src,
  link:  card.querySelector('a')?.href,
  genero: GENERO,
}));

copy(JSON.stringify(dados, null, 2));
console.log(`OK: ${dados.length} itens de ${GENERO} copiados.`);
```

Cole o resultado num arquivo `.txt` (ou direto no chat) **um gênero por vez**.

### Detalhes técnicos

- Nenhuma alteração de schema — `discografias` já tem `artista_nome`, `genero`, `imagem_url` e `links jsonb`.
- Bucket `discografias` já existe e é público.
- Import roda via `code--exec` (Python + service role key do Supabase) — não cria edge function nem UI.
- Imagens são salvas como `discografias/{slug-artista}-{hash}.png` pra evitar colisão.
- Se uma capa falhar no download, mantenho a URL externa como fallback e te aviso.
- Já temos um arquivo "FORRÓ" enviado (458 itens, 250 artistas) — você re-extrai com gênero correto e me reenvia.

### Próximo passo após aprovação

Aguardo você enviar o primeiro `.json` de gênero (sertanejo, pagode, etc.) e disparo a importação.