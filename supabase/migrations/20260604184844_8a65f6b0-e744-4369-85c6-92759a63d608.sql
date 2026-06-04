-- Remove existing duplicates (keep oldest per event_type + mp_payment_id)
DELETE FROM public.admin_push_logs a
USING public.admin_push_logs b
WHERE a.ctid <> b.ctid
  AND a.event_type = b.event_type
  AND (a.data->>'mp_payment_id') IS NOT NULL
  AND (a.data->>'mp_payment_id') = (b.data->>'mp_payment_id')
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS admin_push_logs_dedup_mp_idx
ON public.admin_push_logs (event_type, ((data->>'mp_payment_id')))
WHERE (data ? 'mp_payment_id') AND (data->>'mp_payment_id') IS NOT NULL;