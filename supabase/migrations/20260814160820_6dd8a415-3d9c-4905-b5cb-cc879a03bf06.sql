REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, position, avatar_url, matches_played, cancellations)
  ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;