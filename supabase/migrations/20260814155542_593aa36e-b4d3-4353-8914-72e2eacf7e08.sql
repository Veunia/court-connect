CREATE TYPE public.session_category AS ENUM ('interieur','exterieur','tournoi');
CREATE TYPE public.court_type AS ENUM ('demi','plein');
CREATE TYPE public.session_status AS ENUM ('active','annulee');

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  position TEXT,
  avatar_url TEXT,
  matches_played INTEGER NOT NULL DEFAULT 0,
  cancellations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  category public.session_category NOT NULL DEFAULT 'interieur',
  court public.court_type NOT NULL DEFAULT 'demi',
  max_players INTEGER NOT NULL DEFAULT 12,
  status public.session_status NOT NULL DEFAULT 'active',
  organizer_id UUID NOT NULL REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_sessions TO authenticated;
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select_authenticated" ON public.game_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_insert_organizer" ON public.game_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "sessions_update_organizer" ON public.game_sessions FOR UPDATE TO authenticated USING (auth.uid() = organizer_id) WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "sessions_delete_organizer" ON public.game_sessions FOR DELETE TO authenticated USING (auth.uid() = organizer_id);

CREATE TABLE public.session_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.session_signups TO authenticated;
GRANT ALL ON public.session_signups TO service_role;
ALTER TABLE public.session_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signups_select_authenticated" ON public.session_signups FOR SELECT TO authenticated USING (true);
CREATE POLICY "signups_insert_own" ON public.session_signups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "signups_delete_own" ON public.session_signups FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER game_sessions_touch BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_session_capacity() RETURNS TRIGGER AS $$
DECLARE s public.game_sessions; c INTEGER;
BEGIN
  SELECT * INTO s FROM public.game_sessions WHERE id = NEW.session_id;
  IF s.status <> 'active' THEN RAISE EXCEPTION 'Session annulée'; END IF;
  SELECT count(*) INTO c FROM public.session_signups WHERE session_id = NEW.session_id;
  IF c >= s.max_players THEN RAISE EXCEPTION 'Session complète'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER session_signups_capacity BEFORE INSERT ON public.session_signups FOR EACH ROW EXECUTE FUNCTION public.enforce_session_capacity();

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_signups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;