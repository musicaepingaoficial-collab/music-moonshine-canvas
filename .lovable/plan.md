## Causa provável

No mobile (você está em viewport de 390x638), o diálogo "Nova Discografia" não tem altura máxima nem scroll interno. Como o formulário tem vários campos (nome, gênero, upload de foto, lista de links), o conteúdo ultrapassa a altura da tela e o **botão "Criar Discografia" fica fora da área visível**. Por isso, ao clicar em "salvar", o clique cai em outro elemento (ou o botão está atrás do teclado/barra do navegador) e nada acontece.

Confirmei que:
- Sua conta tem papel `admin` no banco.
- As políticas RLS da tabela `discografias` permitem inserção por admins.
- O bucket `discografias` tem políticas corretas para upload por admins.
- O schema da tabela está correto (sem colunas faltando).

Ou seja, o problema é puramente de UI mobile do diálogo de cadastro.

## O que vou ajustar

Em `src/pages/admin/AdminDiscografiasPage.tsx`, no `<DialogContent>`:

1. Adicionar `max-h-[90vh] overflow-y-auto` para o diálogo virar rolável.
2. Tornar o `DialogFooter` "sticky" no rodapé do diálogo (`sticky bottom-0 bg-background pt-3 border-t`) para que os botões "Cancelar" e "Criar Discografia" fiquem sempre visíveis enquanto você rola.
3. Ajustar a linha de adicionar links (`flex gap-2`) para empilhar no mobile (`flex-col sm:flex-row`), evitando estouro lateral.

Sem mudanças em banco, RLS, storage ou lógica de negócio — só CSS/layout do formulário.
