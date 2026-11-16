CREATE OR REPLACE FUNCTION public.is_space_member(_space uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members m
    WHERE m.space_id = _space AND m.user_id = _user
  )
  AND (
    _user = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.space_members me
      WHERE me.space_id = _space AND me.user_id = auth.uid()
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_space_admin(_space uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members m
    WHERE m.space_id = _space AND m.user_id = _user AND m.role = 'admin'
  )
  AND (
    _user = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.space_members me
      WHERE me.space_id = _space AND me.user_id = auth.uid()
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.is_space_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_space_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_admin(uuid, uuid) TO authenticated;