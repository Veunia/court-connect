CREATE TABLE public.session_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.session_waitlist TO authenticated;
GRANT ALL ON public.session_waitlist TO service_role;

ALTER TABLE public.session_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY waitlist_select_authenticated ON public.session_waitlist
  FOR SELECT TO authenticated USING (true);
CREATE POLICY waitlist_insert_own ON public.session_waitlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY waitlist_delete_own ON public.session_waitlist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s public.game_sessions; c integer; v_user uuid;
BEGIN
  SELECT * INTO s FROM public.game_sessions WHERE id = OLD.session_id;
  IF s.id IS NULL OR s.status <> 'active' THEN RETURN OLD; END IF;
  SELECT count(*) INTO c FROM public.session_signups WHERE session_id = OLD.session_id;
  IF c >= s.max_players THEN RETURN OLD; END IF;
  SELECT user_id INTO v_user FROM public.session_waitlist
    WHERE session_id = OLD.session_id ORDER BY created_at ASC LIMIT 1;
  IF v_user IS NULL THEN RETURN OLD; END IF;
  DELETE FROM public.session_waitlist WHERE session_id = OLD.session_id AND user_id = v_user;
  INSERT INTO public.session_signups (session_id, user_id) VALUES (OLD.session_id, v_user)
    ON CONFLICT DO NOTHING;
  RETURN OLD;
END; $$;

REVOKE ALL ON FUNCTION public.promote_from_waitlist() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER session_signups_promote
AFTER DELETE ON public.session_signups
FOR EACH ROW EXECUTE FUNCTION public.promote_from_waitlist();

CREATE OR REPLACE FUNCTION public.clear_waitlist_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.session_waitlist
   WHERE session_id = NEW.session_id AND user_id = NEW.user_id;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.clear_waitlist_on_signup() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER session_signups_clear_waitlist
AFTER INSERT ON public.session_signups
FOR EACH ROW EXECUTE FUNCTION public.clear_waitlist_on_signup();

ALTER TABLE public.session_waitlist REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_waitlist;