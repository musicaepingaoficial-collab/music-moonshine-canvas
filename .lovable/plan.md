## Objetivo

Adicionar as 4 capas enviadas (Maio 2026 laranja, Maio 2026 rosa, Festa Junina, Música e Pinga) em uma nova seção visual da página de vendas (`src/pages/LandingPage.tsx`).

## Onde

Nova seção **"Atualizações e seleções da semana"** inserida entre a seção atual de prévia (linha ~400) e a próxima seção (`border-t border-border/40`). Fica acima dos planos, funcionando como prova visual do conteúdo entregue.

## Como

1. Copiar as 4 imagens de `user-uploads://` para `src/assets/repertorios/`:
   - `capa-maio-laranja.jpg`
   - `capa-maio-rosa.jpg`
   - `capa-festa-junina.jpg`
   - `capa-musica-pinga.jpg`

2. Importar como ES6 modules na `LandingPage.tsx`.

3. Criar uma nova `<section>` com:
   - Título: *"Atualizações constantes, capas profissionais"*
   - Subtítulo curto: *"Toda semana novos repertórios prontos pra você baixar."*
   - Grid responsivo: 2 colunas no mobile, 4 no desktop (`grid-cols-2 md:grid-cols-4`), `gap-4`.
   - Cada capa em `aspect-[3/5]` com `object-cover`, `rounded-xl`, sombra forte e leve hover-zoom (escala 1.03), seguindo a estética existente (gradientes/borders já usados na página).
   - Badges sutis sobre cada capa (ex.: "NOVO", "MAIO/26", "FESTA JUNINA", "SÓ MODÃO").

4. Sem mudanças em outras seções, sem lógica nova — puramente visual/apresentação.

## Arquivos afetados

- `src/assets/repertorios/*.jpg` (4 novos)
- `src/pages/LandingPage.tsx` (imports + nova seção)
