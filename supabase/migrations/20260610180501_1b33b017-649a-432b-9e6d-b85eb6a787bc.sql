-- 1. Criar função para vincular assinaturas órfãs baseada no histórico de pagamentos pendentes
DO $$
DECLARE
    rec RECORD;
    CorrectUserId UUID;
BEGIN
    -- Loop por assinaturas vinculadas a perfis "fantasma" (sem email e nome)
    FOR rec IN 
        SELECT 
            a.id as sub_id,
            ps.email as real_email,
            ps.mp_payment_id
        FROM public.assinaturas a
        JOIN public.profiles p_orphan ON a.user_id = p_orphan.id
        JOIN public.pending_subscriptions ps ON a.user_id = ps.claimed_user_id OR ps.mp_payment_id::text = a.id::text -- tentativa de match
        WHERE (p_orphan.email IS NULL OR p_orphan.email = '')
          AND (p_orphan.name IS NULL OR p_orphan.name = '')
          AND ps.email IS NOT NULL
    LOOP
        -- Tentar encontrar se esse e-mail já possui uma conta real criada depois
        SELECT id INTO CorrectUserId FROM public.profiles WHERE lower(trim(email)) = lower(trim(rec.real_email)) LIMIT 1;
        
        IF CorrectUserId IS NOT NULL THEN
            UPDATE public.assinaturas SET user_id = CorrectUserId WHERE id = rec.sub_id;
            RAISE NOTICE 'Assinatura % vinculada ao usuário real %', rec.sub_id, rec.real_email;
        END IF;
    END LOOP;
END $$;

-- 2. Garantir que webhooks duplicados não criem logs repetidos (se o índice ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_push_logs_dedup') THEN
        CREATE UNIQUE INDEX idx_admin_push_logs_dedup ON public.admin_push_logs (event_type, (data->>'mp_payment_id')) 
        WHERE (data->>'mp_payment_id') IS NOT NULL;
    END IF;
END $$;
