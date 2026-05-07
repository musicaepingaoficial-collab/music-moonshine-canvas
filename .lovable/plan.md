# Plano: Repertórios do admin como catálogo global

## Objetivo
Todo repertório criado por um admin deve ficar visível para qualquer usuário autenticado. Usuários comuns continuam vendo, além disso, os próprios repertórios.

## Causa raiz (diagnóstico)
A política RLS atual de `repertorios` só permite SELECT quando `user_id = auth.uid()` (ou se o leitor for admin). Como os 3 repertórios existentes pertencem ao admin, qualquer outro usuário (mesmo vitalício) recebe 0 linhas e vê o estado "Nenhum repertório criado ainda."

O mesmo se aplica à tabela `repertorio_musicas`, que hoje só libera leitura ao dono do repertório ou a admins — então mesmo abrindo a visibilidade dos repertórios, as músicas dentro dele continuariam ocultas.

## Mudanças (somente no banco — RLS)

### 1. Tabela `repertorios`
Adicionar uma política SELECT que libera leitura de qualquer repertório cujo dono (`user_id`) seja um admin:

```sql
CREATE POLICY "Anyone can view admin repertorios"
ON public.repertorios
FOR SELECT
TO authenticated
USING (public.has_role(user_id, 'admin'::app_role));
```

As políticas existentes ("Admins can manage all repertorios" e "Users can manage own repertorios") permanecem — usuário comum continua podendo criar/editar/excluir os próprios.

### 2. Tabela `repertorio_musicas`
Adicionar política SELECT espelhada para liberar a lista de músicas de repertórios cujo dono seja admin:

```sql
CREATE POLICY "Anyone can view musicas of admin repertorios"
ON public.repertorio_musicas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repertorios r
    WHERE r.id = repertorio_musicas.repertorio_id
      AND public.has_role(r.user_id, 'admin'::app_role)
  )
);
```

## O que NÃO muda
- Nenhuma alteração no frontend — `useRepertorios`, `DashboardPage`, `RepertorioPage` continuam iguais; o RLS passa a devolver os repertórios do admin automaticamente.
- Repertórios criados por usuários comuns continuam privados a eles.
- Permissões de escrita (insert/update/delete) ficam inalteradas.

## Resultado esperado
Após aprovar a migração, qualquer usuário logado (vitalício ou assinante) verá no Dashboard / página de Repertórios todos os repertórios criados pelo admin, com suas músicas acessíveis.
