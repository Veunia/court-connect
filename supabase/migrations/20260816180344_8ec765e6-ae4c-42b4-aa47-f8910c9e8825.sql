-- 1. Tables
CREATE TYPE public.space_role AS ENUM ('admin', 'member');

CREATE TABLE public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  invite_code text NOT NULL UNIQUE,
  invite_code_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spaces TO authenticated;
GRANT ALL ON public.spaces TO service_role;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.space_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.space_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_members TO authenticated;
GRANT ALL ON public.space_members TO service_role;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.space_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_invites TO authenticated;
GRANT ALL ON public.space_invites TO service_role;
ALTER TABLE public.space_invites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER spaces_touch BEFORE UPDATE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Helper functions (security definer, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_space_member(_space uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.space_members WHERE space_id = _space AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_space_admin(_space uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.space_members WHERE space_id = _space AND user_id = _user AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.shares_space_with(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.space_members a
    JOIN public.space_members b ON a.space_id = b.space_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.spaces WHERE invite_code = code);
  END LOOP;
  RETURN code;
END; $$;

-- creator becomes admin automatically
CREATE OR REPLACE FUNCTION public.space_add_creator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT DO NOTHING;
  DELETE FROM public.space_invites WHERE space_id = NEW.id AND lower(email) IN (
    SELECT lower(email) FROM public.profiles WHERE id = NEW.created_by
  );
  RETURN NEW;
END; $$;
CREATE TRIGGER spaces_add_creator AFTER INSERT ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.space_add_creator();

CREATE OR REPLACE FUNCTION public.create_space(_name text, _description text)
RETURNS public.spaces LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.spaces;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF coalesce(trim(_name), '') = '' THEN RAISE EXCEPTION 'Nom requis'; END IF;
  INSERT INTO public.spaces (name, description, invite_code, created_by)
  VALUES (trim(_name), nullif(trim(coalesce(_description, '')), ''), public.generate_invite_code(), auth.uid())
  RETURNING * INTO s;
  RETURN s;
END; $$;

CREATE OR REPLACE FUNCTION public.join_space_by_code(_code text)
RETURNS public.spaces LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.spaces;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO s FROM public.spaces
   WHERE upper(replace(invite_code, '-', '')) = upper(replace(coalesce(_code, ''), '-', ''));
  IF s.id IS NULL THEN RAISE EXCEPTION 'Code invalide'; END IF;
  IF NOT s.invite_code_active THEN RAISE EXCEPTION 'Ce code n''est plus actif'; END IF;
  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (s.id, auth.uid(), 'member') ON CONFLICT DO NOTHING;
  DELETE FROM public.space_invites WHERE space_id = s.id AND lower(email) IN (
    SELECT lower(email) FROM public.profiles WHERE id = auth.uid()
  );
  RETURN s;
END; $$;

CREATE OR REPLACE FUNCTION public.regenerate_invite_code(_space uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_code text;
BEGIN
  IF NOT public.is_space_admin(_space, auth.uid()) THEN RAISE EXCEPTION 'Réservé aux admins'; END IF;
  new_code := public.generate_invite_code();
  UPDATE public.spaces SET invite_code = new_code, invite_code_active = true WHERE id = _space;
  RETURN new_code;
END; $$;

CREATE OR REPLACE FUNCTION public.accept_pending_invites()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text; n integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.space_members (space_id, user_id, role)
    SELECT space_id, auth.uid(), 'member' FROM public.space_invites WHERE lower(email) = v_email
    ON CONFLICT DO NOTHING;
  DELETE FROM public.space_invites WHERE lower(email) = v_email;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

-- 3. Policies for the new tables
CREATE POLICY spaces_select_member ON public.spaces FOR SELECT TO authenticated
  USING (public.is_space_member(id, auth.uid()));
CREATE POLICY spaces_insert_self ON public.spaces FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY spaces_update_admin ON public.spaces FOR UPDATE TO authenticated
  USING (public.is_space_admin(id, auth.uid())) WITH CHECK (public.is_space_admin(id, auth.uid()));
CREATE POLICY spaces_delete_admin ON public.spaces FOR DELETE TO authenticated
  USING (public.is_space_admin(id, auth.uid()));

CREATE POLICY members_select_same_space ON public.space_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_space_member(space_id, auth.uid()));
CREATE POLICY members_insert_admin ON public.space_members FOR INSERT TO authenticated
  WITH CHECK (public.is_space_admin(space_id, auth.uid()));
CREATE POLICY members_update_admin ON public.space_members FOR UPDATE TO authenticated
  USING (public.is_space_admin(space_id, auth.uid())) WITH CHECK (public.is_space_admin(space_id, auth.uid()));
CREATE POLICY members_delete_admin_or_self ON public.space_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_space_admin(space_id, auth.uid()));

CREATE POLICY invites_select_admin_or_invitee ON public.space_invites FOR SELECT TO authenticated
  USING (public.is_space_admin(space_id, auth.uid()) OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
CREATE POLICY invites_insert_admin ON public.space_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_space_admin(space_id, auth.uid()) AND invited_by = auth.uid());
CREATE POLICY invites_delete_admin ON public.space_invites FOR DELETE TO authenticated
  USING (public.is_space_admin(space_id, auth.uid()));

-- 4. Sessions scoped to a space; wipe demo data
DELETE FROM public.session_waitlist;
DELETE FROM public.session_signups;
DELETE FROM public.game_sessions;

ALTER TABLE public.game_sessions
  ADD COLUMN space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE;
CREATE INDEX game_sessions_space_idx ON public.game_sessions (space_id);

DROP POLICY IF EXISTS sessions_select_authenticated ON public.game_sessions;
DROP POLICY IF EXISTS sessions_insert_organizer ON public.game_sessions;
DROP POLICY IF EXISTS sessions_update_organizer ON public.game_sessions;
DROP POLICY IF EXISTS sessions_delete_organizer ON public.game_sessions;

CREATE POLICY sessions_select_space_member ON public.game_sessions FOR SELECT TO authenticated
  USING (public.is_space_member(space_id, auth.uid()));
CREATE POLICY sessions_insert_space_member ON public.game_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organizer_id AND public.is_space_member(space_id, auth.uid()));
CREATE POLICY sessions_update_organizer ON public.game_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = organizer_id AND public.is_space_member(space_id, auth.uid()))
  WITH CHECK (auth.uid() = organizer_id AND public.is_space_member(space_id, auth.uid()));
CREATE POLICY sessions_delete_organizer ON public.game_sessions FOR DELETE TO authenticated
  USING (auth.uid() = organizer_id AND public.is_space_member(space_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.session_in_my_space(_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_sessions s
    JOIN public.space_members m ON m.space_id = s.space_id
    WHERE s.id = _session AND m.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS signups_select_authenticated ON public.session_signups;
DROP POLICY IF EXISTS signups_insert_own ON public.session_signups;
DROP POLICY IF EXISTS signups_delete_own ON public.session_signups;
CREATE POLICY signups_select_space ON public.session_signups FOR SELECT TO authenticated
  USING (public.session_in_my_space(session_id));
CREATE POLICY signups_insert_own ON public.session_signups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.session_in_my_space(session_id));
CREATE POLICY signups_delete_own ON public.session_signups FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS waitlist_select_authenticated ON public.session_waitlist;
DROP POLICY IF EXISTS waitlist_insert_own ON public.session_waitlist;
DROP POLICY IF EXISTS waitlist_delete_own ON public.session_waitlist;
CREATE POLICY waitlist_select_space ON public.session_waitlist FOR SELECT TO authenticated
  USING (public.session_in_my_space(session_id));
CREATE POLICY waitlist_insert_own ON public.session_waitlist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.session_in_my_space(session_id));
CREATE POLICY waitlist_delete_own ON public.session_waitlist FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Profiles visible only to people sharing a space
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_shared_space ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_space_with(id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.space_members;