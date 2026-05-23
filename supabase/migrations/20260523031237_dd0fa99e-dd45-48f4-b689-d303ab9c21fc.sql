-- Revoke EXECUTE on SECURITY DEFINER trigger functions from public roles.
-- These functions are only called by triggers, never directly from the API.
-- has_role and has_pdf_access are NOT revoked because they're used in RLS policies
-- and need to remain callable by the policy engine.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_admin_for_allowlisted_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_profile_email() FROM PUBLIC, anon, authenticated;