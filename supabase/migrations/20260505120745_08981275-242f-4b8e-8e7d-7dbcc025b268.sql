-- Verifica se a restrição já existe antes de tentar criar
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'musicas_file_url_key'
    ) THEN
        ALTER TABLE public.musicas ADD CONSTRAINT musicas_file_url_key UNIQUE (file_url);
    END IF;
END $$;