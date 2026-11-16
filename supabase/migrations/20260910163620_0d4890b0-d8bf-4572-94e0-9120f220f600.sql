-- 1) Journalisation durable des échecs de code d'invitation (nouvelle fonction, sans RAISE)
CREATE OR REPLACE FUNCTION public.join_space_by_code_safe(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE s public.spaces; v_user uuid := auth.uid(); v_fails integer;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'unauthenticated'); END IF;
  IF NOT public.email_confirmed() THEN RETURN jsonb_build_object('status', 'email_unconfirmed'); END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':join_code', 0));

  SELECT count(*) INTO v_fails FROM public.rate_events
   WHERE user_id = v_user AND kind = 'join_code' AND NOT success
     AND created_at > now() - interval '10 minutes';
  IF v_fails >= 5 THEN RETURN jsonb_build_object('status', 'rate_limited'); END IF;

  SELECT * INTO s FROM public.spaces
   WHERE upper(replace(invite_code, '-', '')) = upper(replace(coalesce(_code, ''), '-', ''));

  IF s.id IS NULL OR NOT s.invite_code_active THEN
    INSERT INTO public.rate_events (user_id, kind, success) VALUES (v_user, 'join_code', false);
    RETURN jsonb_build_object('status', 'invalid_code');
  END IF;

  INSERT INTO public.rate_events (user_id, kind, success) VALUES (v_user, 'join_code', true);
  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (s.id, v_user, 'member') ON CONFLICT DO NOTHING;
  DELETE FROM public.space_invites WHERE space_id = s.id AND lower(email) IN (
    SELECT lower(email) FROM auth.users WHERE id = v_user
  );
  RETURN jsonb_build_object('status', 'joined', 'space', to_jsonb(s));
END $$;

GRANT EXECUTE ON FUNCTION public.join_space_by_code_safe(text) TO authenticated;

-- 2) L'ordre d'arrivée n'est plus fourni par le client
REVOKE INSERT ON public.session_signups FROM authenticated;
REVOKE INSERT ON public.session_waitlist FROM authenticated;
GRANT INSERT (session_id, user_id) ON public.session_signups TO authenticated;
GRANT INSERT (session_id, user_id) ON public.session_waitlist TO authenticated;

-- 3) Contrôles métier appliqués aussi aux écritures directes
CREATE OR REPLACE FUNCTION public.enforce_session_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE s public.game_sessions; c integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.session_id::text, 0));
  SELECT * INTO s FROM public.game_sessions WHERE id = NEW.session_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session inconnue'; END IF;
  IF s.status <> 'active' THEN RAISE EXCEPTION 'Session annulée'; END IF;
  IF NOT public.is_space_member(s.space_id, NEW.user_id) THEN RAISE EXCEPTION 'Réservé aux membres de l''espace'; END IF;
  IF NEW.user_id = auth.uid() AND NOT public.email_confirmed() THEN
    RAISE EXCEPTION 'Confirme ton email avant de t''inscrire.';
  END IF;
  IF (s.session_date + s.end_time) < (now() AT TIME ZONE 'Europe/Paris') THEN
    RAISE EXCEPTION 'Cette session est terminée.';
  END IF;
  SELECT count(*) INTO c FROM public.session_signups WHERE session_id = NEW.session_id;
  IF c >= s.max_players THEN RAISE EXCEPTION 'Session complète'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.reject_waitlist_if_signed_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE s public.game_sessions; c integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.session_signups
              WHERE session_id = NEW.session_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Déjà inscrit à cette session';
  END IF;
  SELECT * INTO s FROM public.game_sessions WHERE id = NEW.session_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session inconnue'; END IF;
  IF s.status <> 'active' THEN RAISE EXCEPTION 'Session annulée'; END IF;
  IF NOT public.is_space_member(s.space_id, NEW.user_id) THEN RAISE EXCEPTION 'Réservé aux membres de l''espace'; END IF;
  IF NEW.user_id = auth.uid() AND NOT public.email_confirmed() THEN
    RAISE EXCEPTION 'Confirme ton email avant de rejoindre la liste d''attente.';
  END IF;
  IF (s.session_date + s.end_time) < (now() AT TIME ZONE 'Europe/Paris') THEN
    RAISE EXCEPTION 'Cette session est terminée.';
  END IF;
  SELECT count(*) INTO c FROM public.session_signups WHERE session_id = NEW.session_id;
  IF c < s.max_players THEN
    RAISE EXCEPTION 'Des places sont encore libres : inscris-toi directement.';
  END IF;
  RETURN NEW;
END $$;

-- Les RPC refusent aussi les sessions terminées
CREATE OR REPLACE FUNCTION public.join_session(_session uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE s public.game_sessions; c integer; v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'unauthenticated'); END IF;
  IF NOT public.email_confirmed() THEN RETURN jsonb_build_object('status', 'email_unconfirmed'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_session::text, 0));
  SELECT * INTO s FROM public.game_sessions WHERE id = _session FOR UPDATE;
  IF s.id IS NULL THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT public.is_space_member(s.space_id, v_user) THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  IF s.status <> 'active' THEN RETURN jsonb_build_object('status', 'cancelled'); END IF;
  IF EXISTS (SELECT 1 FROM public.session_signups WHERE session_id = _session AND user_id = v_user) THEN
    SELECT count(*) INTO c FROM public.session_signups WHERE session_id = _session;
    RETURN jsonb_build_object('status', 'joined', 'count', c);
  END IF;
  IF (s.session_date + s.end_time) < (now() AT TIME ZONE 'Europe/Paris') THEN
    RETURN jsonb_build_object('status', 'finished');
  END IF;
  SELECT count(*) INTO c FROM public.session_signups WHERE session_id = _session;
  IF c >= s.max_players THEN RETURN jsonb_build_object('status', 'full', 'count', c); END IF;
  INSERT INTO public.session_signups (session_id, user_id) VALUES (_session, v_user);
  DELETE FROM public.session_waitlist WHERE session_id = _session AND user_id = v_user;
  RETURN jsonb_build_object('status', 'joined', 'count', c + 1);
END $$;

CREATE OR REPLACE FUNCTION public.join_waitlist(_session uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE s public.game_sessions; c integer; v_user uuid := auth.uid(); v_pos integer;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('status', 'unauthenticated'); END IF;
  IF NOT public.email_confirmed() THEN RETURN jsonb_build_object('status', 'email_unconfirmed'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_session::text, 0));
  SELECT * INTO s FROM public.game_sessions WHERE id = _session FOR UPDATE;
  IF s.id IS NULL THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT public.is_space_member(s.space_id, v_user) THEN RETURN jsonb_build_object('status', 'forbidden'); END IF;
  IF s.status <> 'active' THEN RETURN jsonb_build_object('status', 'cancelled'); END IF;
  IF EXISTS (SELECT 1 FROM public.session_signups WHERE session_id = _session AND user_id = v_user) THEN
    RETURN jsonb_build_object('status', 'already_signed_up');
  END IF;
  IF (s.session_date + s.end_time) < (now() AT TIME ZONE 'Europe/Paris') THEN
    RETURN jsonb_build_object('status', 'finished');
  END IF;
  SELECT count(*) INTO c FROM public.session_signups WHERE session_id = _session;
  IF c < s.max_players THEN
    INSERT INTO public.session_signups (session_id, user_id) VALUES (_session, v_user);
    DELETE FROM public.session_waitlist WHERE session_id = _session AND user_id = v_user;
    RETURN jsonb_build_object('status', 'joined', 'count', c + 1);
  END IF;
  INSERT INTO public.session_waitlist (session_id, user_id) VALUES (_session, v_user)
    ON CONFLICT (session_id, user_id) DO NOTHING;
  SELECT count(*) INTO v_pos FROM public.session_waitlist w
   WHERE w.session_id = _session
     AND w.created_at <= (SELECT created_at FROM public.session_waitlist
                           WHERE session_id = _session AND user_id = v_user);
  RETURN jsonb_build_object('status', 'waitlisted', 'position', v_pos);
END $$;

-- 4) Invariants de session côté serveur
ALTER TABLE public.game_sessions
  ADD CONSTRAINT game_sessions_time_order CHECK (end_time > start_time),
  ADD CONSTRAINT game_sessions_capacity_range CHECK (max_players BETWEEN 2 AND 50),
  ADD CONSTRAINT game_sessions_title_len CHECK (title IS NULL OR char_length(title) <= 80),
  ADD CONSTRAINT game_sessions_location_len CHECK (char_length(location) BETWEEN 2 AND 160),
  ADD CONSTRAINT game_sessions_whatsapp_url CHECK (
    whatsapp_url IS NULL
    OR (char_length(whatsapp_url) <= 300
        AND whatsapp_url ~* '^https://(chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com)/')
  );

-- 5) Capacité : pas en dessous des inscrits ; promotion à la hausse
CREATE OR REPLACE FUNCTION public.enforce_capacity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE c integer;
BEGIN
  IF NEW.max_players = OLD.max_players THEN RETURN NEW; END IF;
  SELECT count(*) INTO c FROM public.session_signups WHERE session_id = NEW.id;
  IF NEW.max_players < c THEN
    RAISE EXCEPTION 'Déjà % joueurs inscrits : la capacité ne peut pas descendre en dessous.', c;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER game_sessions_capacity_change
BEFORE UPDATE ON public.game_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_capacity_change();

CREATE OR REPLACE FUNCTION public.promote_after_capacity_increase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE c integer; v_user uuid;
BEGIN
  IF NEW.status <> 'active' OR NEW.max_players <= OLD.max_players THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text, 0));
  LOOP
    SELECT count(*) INTO c FROM public.session_signups WHERE session_id = NEW.id;
    EXIT WHEN c >= NEW.max_players;
    SELECT user_id INTO v_user FROM public.session_waitlist
      WHERE session_id = NEW.id ORDER BY created_at ASC, id ASC LIMIT 1;
    EXIT WHEN v_user IS NULL;
    DELETE FROM public.session_waitlist WHERE session_id = NEW.id AND user_id = v_user;
    INSERT INTO public.session_signups (session_id, user_id) VALUES (NEW.id, v_user)
      ON CONFLICT (session_id, user_id) DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER game_sessions_promote_on_increase
AFTER UPDATE ON public.game_sessions
FOR EACH ROW EXECUTE FUNCTION public.promote_after_capacity_increase();