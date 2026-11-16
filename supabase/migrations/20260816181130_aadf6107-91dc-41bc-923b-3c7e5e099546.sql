-- 1. Fonctions purement internes (triggers + helper de code) : aucun appel via l'API.
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_session_capacity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.space_add_creator() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_waitlist_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_from_waitlist() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;

-- 2. RPC métier : réservées aux utilisateurs connectés.
REVOKE ALL ON FUNCTION public.create_space(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_space_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_invite_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_pending_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_space(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_space_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_pending_invites() TO authenticated;

-- 3. Prédicats utilisés par les politiques RLS : connectés uniquement (nécessaires à l'évaluation des politiques).
REVOKE ALL ON FUNCTION public.is_space_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_space_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_space_with(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.session_in_my_space(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_space_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.session_in_my_space(uuid) TO authenticated;