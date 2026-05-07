-- Restrict execution of security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_pdf_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_pdf_access(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_profile_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_profile_update() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.assign_admin_for_allowlisted_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_admin_for_allowlisted_email() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
