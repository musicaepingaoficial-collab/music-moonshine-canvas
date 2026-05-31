-- 1. Primeiro, atualiza os registros que NÃO causarão conflito (artistas que só existem como 'FORRÓ')
UPDATE public.discografias d1
SET genero = 'Forró'
WHERE genero = 'FORRÓ'
AND NOT EXISTS (
    SELECT 1 FROM public.discografias d2 
    WHERE d2.artista_nome = d1.artista_nome 
    AND d2.genero = 'Forró'
);

-- 2. Para os registros que CAUSARIAM conflito, mesclamos os links no registro 'Forró' existente
UPDATE public.discografias d_target
SET 
    links = (
        SELECT jsonb_agg(DISTINCT elem)
        FROM (
            SELECT jsonb_array_elements(d_target.links) AS elem
            UNION
            SELECT jsonb_array_elements(d_source.links) AS elem
            FROM public.discografias d_source
            WHERE d_source.artista_nome = d_target.artista_nome
            AND d_source.genero = 'FORRÓ'
        ) s
    ),
    imagem_url = COALESCE(d_target.imagem_url, (
        SELECT d_source.imagem_url 
        FROM public.discografias d_source 
        WHERE d_source.artista_nome = d_target.artista_nome 
        AND d_source.genero = 'FORRÓ'
    ))
WHERE d_target.genero = 'Forró'
AND EXISTS (
    SELECT 1 FROM public.discografias d_source
    WHERE d_source.artista_nome = d_target.artista_nome
    AND d_source.genero = 'FORRÓ'
);

-- 3. Agora podemos deletar os registros 'FORRÓ' restantes (que já foram mesclados)
DELETE FROM public.discografias 
WHERE genero = 'FORRÓ';