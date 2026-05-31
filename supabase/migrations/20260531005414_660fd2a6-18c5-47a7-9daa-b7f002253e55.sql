UPDATE public.discografias
SET links = (
  SELECT jsonb_agg(
    CASE 
      WHEN obj->>'label' = 'AGORA' THEN jsonb_set(obj, '{label}', '"Parte Única"')
      ELSE obj
    END
  )
  FROM jsonb_array_elements(links) AS obj
)
WHERE links @> '[{"label": "AGORA"}]';