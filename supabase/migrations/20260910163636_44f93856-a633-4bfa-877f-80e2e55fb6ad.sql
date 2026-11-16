REVOKE ALL ON FUNCTION public.enforce_capacity_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_after_capacity_increase() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_session_capacity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_waitlist_if_signed_up() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_space_by_code_safe(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_space_by_code_safe(text) TO authenticated;