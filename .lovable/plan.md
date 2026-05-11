# Corrigir overflow horizontal em pastas com nomes longos

## Problema

Em `/repertorio/:id`, ao abrir uma subpasta cujo nome é longo (ex.: "13. TATY GIRL - RELIQUIAS CAIXA TOP PRODUÇÕES com vinheta"), a página inteira ganha largura maior que a viewport no mobile:

- Cabeçalho ("3738 Musicas • 10.76 GB") fica cortado à direita
- Botão "Voltar" desalinha
- Breadcrumb fica cortado
- Grid de cards aparece com 1 card ocupando quase toda a tela em vez de 2 colunas

Em pastas com nome curto ("01. HITS") o layout fica certo — confirmando que o problema é texto longo, não os cards.

## Causa raiz

Em `src/pages/RepertorioPage.tsx`, na seção que renderiza o título da pasta selecionada (linhas ~657-695):

```tsx
<div className="flex items-center justify-between">
  <h3 className="text-sm font-semibold flex items-center gap-2">
    <Music2 className="h-4 w-4 text-primary" />
    Músicas em {selectedFolder.split('/').pop()}
  </h3>
  {selectedFolder && (
    <div className="flex items-center gap-2">
      <Button>Baixar pasta</Button>
    </div>
  )}
</div>
```

Problemas:

1. O `<h3>` não tem `truncate` nem `min-w-0`, então cresce até o tamanho do texto inteiro
2. O wrapper `<div className="flex items-center justify-between">` também não tem `min-w-0`, então é empurrado pelo h3
3. Resultado: o bloco fica mais largo que `w-full`, estourando o `overflow-x-hidden` do `<main>` (em alguns browsers o overflow-hidden não contém filhos com tamanho intrínseco maior em certas combinações de flex)
4. O grid `grid-cols-2` abaixo herda essa largura inflada e cada card vira ~340px

## Solução

### 1. Tornar o título truncável

No header da seção de músicas em `RepertorioPage.tsx`:

```tsx
<div className="flex items-center justify-between gap-3 min-w-0">
  <h3 className="text-sm font-semibold flex items-center gap-2 min-w-0 flex-1">
    <Music2 className="h-4 w-4 text-primary shrink-0" />
    <span className="truncate">
      {selectedFolder
        ? `Músicas em ${selectedFolder.split('/').pop()}`
        : 'Músicas na Raiz'}
    </span>
  </h3>
  {selectedFolder && (
    <div className="flex items-center gap-2 shrink-0">
      <Button>Baixar pasta</Button>
    </div>
  )}
</div>
```

Aplicar o mesmo padrão (`min-w-0 flex-1` + `<span className="truncate">` + `shrink-0` no ícone) nas três variantes do `h3` (selectedFolder, raiz, "Selecione uma subpasta").

### 2. Garantir contenção no wrapper da seção

Adicionar `min-w-0` no `<div className="space-y-3">` que envolve o header + grid (linha ~657), para que o grid de baixo nunca herde largura inflada.

### 3. Defensivo no header superior do repertório

Verificar o bloco de cabeçalho com nome do repertório (linhas ~447-479) — o `<h1>` já tem `truncate`, mas o wrapper `<div className="flex-1 min-w-0 ...">` está OK. Sem mudanças necessárias ali, apenas confirmar.

## Resultado esperado

- Pastas com nome longo passam a ter o título truncado com "…" e os cards ficam em 2 colunas perfeitas no mobile, igual à pasta "01. HITS" do screenshot correto
- Sem scroll horizontal em nenhuma resolução
- Layout idêntico para nomes curtos e longos
- Apenas mudanças de presentation, sem alterar lógica
