import { supabase } from "@/integrations/supabase/client";
import type { CourtType } from "./affluence";
import { todayISO } from "./fr";
import { profileInputSchema, sessionInputSchema, uuidSchema, validate } from "./validation";

export type Category = "interieur" | "exterieur" | "tournoi";

export const CATEGORY_LABEL: Record<Category, string> = {
  interieur: "INTÉRIEUR",
  exterieur: "EXTÉRIEUR",
  tournoi: "TOURNOI",
};

export const POSITIONS = ["Meneur", "Arrière", "Ailier", "Ailier fort", "Pivot"] as const;

export type Profile = {
  id: string;
  full_name: string | null;
  position: string | null;
  avatar_url: string | null;
  matches_played: number;
  cancellations: number;
};

// L'email n'est jamais lu depuis la table profiles (donnée personnelle) :
// on utilise celui de la session authentifiée côté client.
const PROFILE_COLUMNS = "id, full_name, position, avatar_url, matches_played, cancellations";

export type SessionRow = {
  id: string;
  title: string | null;
  space_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  category: Category;
  court: CourtType;
  max_players: number;
  status: "active" | "annulee";
  organizer_id: string;
  whatsapp_url: string | null;
};

export type SessionWithPlayers = SessionRow & {
  organizer: Profile | null;
  players: Profile[];
  count: number;
  waitlist: Profile[];
};

async function loadProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("id", unique);
  if (error) throw error;
  return new Map((data as Profile[]).map((p) => [p.id, p]));
}

async function enrich(sessions: SessionRow[]): Promise<SessionWithPlayers[]> {
  if (sessions.length === 0) return [];
  const ids = sessions.map((s) => s.id);
  const { data: signups, error } = await supabase
    .from("session_signups")
    .select("session_id, user_id, created_at")
    .in("session_id", ids)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (signups ?? []) as { session_id: string; user_id: string }[];

  const { data: waiting, error: waitError } = await supabase
    .from("session_waitlist")
    .select("session_id, user_id, created_at")
    .in("session_id", ids)
    .order("created_at", { ascending: true });
  if (waitError) throw waitError;
  const waitRows = (waiting ?? []) as { session_id: string; user_id: string }[];

  const profiles = await loadProfiles([
    ...rows.map((r) => r.user_id),
    ...waitRows.map((r) => r.user_id),
    ...sessions.map((s) => s.organizer_id),
  ]);

  return sessions.map((session) => {
    const players = rows
      .filter((r) => r.session_id === session.id)
      .map((r) => profiles.get(r.user_id))
      .filter((p): p is Profile => Boolean(p));
    const waitlist = waitRows
      .filter((r) => r.session_id === session.id)
      .map((r) => profiles.get(r.user_id))
      .filter((p): p is Profile => Boolean(p));
    return {
      ...session,
      organizer: profiles.get(session.organizer_id) ?? null,
      players,
      waitlist,
      count: rows.filter((r) => r.session_id === session.id).length,
    };
  });
}

export async function fetchUpcomingSessions(spaceId: string): Promise<SessionWithPlayers[]> {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("space_id", spaceId)
    .eq("status", "active")
    .gte("session_date", todayISO())
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return enrich((data ?? []) as SessionRow[]);
}

export async function fetchSession(id: string): Promise<SessionWithPlayers | null> {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [enriched] = await enrich([data as SessionRow]);
  return enriched ?? null;
}

/** Statuts renvoyés par les fonctions atomiques d'inscription en base. */
export type SignupStatus =
  | "joined"
  | "left"
  | "waitlisted"
  | "full"
  | "cancelled"
  | "not_found"
  | "forbidden"
  | "email_unconfirmed"
  | "unauthenticated"
  | "already_signed_up";

export type SignupResult = { status: SignupStatus; count?: number; position?: number };

async function callSignupRpc(
  fn: "join_session" | "leave_session" | "join_waitlist" | "leave_waitlist",
  sessionId: string,
): Promise<SignupResult> {
  validate(uuidSchema, sessionId);
  const { data, error } = await supabase.rpc(fn, { _session: sessionId });
  if (error) {
    console.error(`[signup] ${fn} a échoué`, {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw error;
  }
  return (data ?? { status: "joined" }) as unknown as SignupResult;
}

export const joinSession = (sessionId: string) => callSignupRpc("join_session", sessionId);
export const leaveSession = (sessionId: string) => callSignupRpc("leave_session", sessionId);
export const joinWaitlist = (sessionId: string) => callSignupRpc("join_waitlist", sessionId);
export const leaveWaitlist = (sessionId: string) => callSignupRpc("leave_waitlist", sessionId);

export type SessionInput = {
  title: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  category: Category;
  court: CourtType;
  max_players: number;
  whatsapp_url: string | null;
};

export async function createSession(
  input: SessionInput,
  organizerId: string,
  spaceId: string,
): Promise<string> {
  const clean = validate(sessionInputSchema, input);
  validate(uuidSchema, organizerId);
  validate(uuidSchema, spaceId);
  const { data, error } = await supabase
    .from("game_sessions")
    .insert({ ...clean, organizer_id: organizerId, space_id: spaceId })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateSession(id: string, input: SessionInput) {
  const clean = validate(sessionInputSchema, input);
  validate(uuidSchema, id);
  const { error } = await supabase.from("game_sessions").update(clean).eq("id", id);
  if (error) throw error;
}

export async function cancelSession(id: string) {
  const { error } = await supabase.from("game_sessions").update({ status: "annulee" }).eq("id", id);
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function upsertProfile(
  profile: Partial<Profile> & { id: string; email?: string | null },
) {
  validate(uuidSchema, profile.id);
  // On ne valide que les champs réellement fournis (les écrans envoient des mises à jour partielles).
  const fields = profileInputSchema.partial().parse({
    ...("full_name" in profile ? { full_name: profile.full_name ?? null } : {}),
    ...("position" in profile ? { position: profile.position ?? null } : {}),
    ...("avatar_url" in profile ? { avatar_url: profile.avatar_url ?? null } : {}),
  });
  // Payload explicite : aucune clé à `undefined`, aucune colonne non prévue.
  const payload: {
    id: string;
    email?: string | null;
    full_name?: string | null;
    position?: string | null;
    avatar_url?: string | null;
  } = { id: profile.id };
  if ("email" in profile) payload.email = profile.email ?? null;
  if (fields.full_name !== undefined) payload.full_name = fields.full_name;
  if (fields.position !== undefined) payload.position = fields.position;
  if (fields.avatar_url !== undefined) payload.avatar_url = fields.avatar_url;
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

const AVATAR_BUCKET = "avatars";
/** Lien signé longue durée : le stockage est privé, mais l'URL reste utilisable dans les listes. */
const AVATAR_URL_TTL = 60 * 60 * 24 * 365 * 10;

/** Téléverse une photo de profil et renvoie une URL affichable. */
export async function uploadAvatar(userId: string, file: Blob, ext = "jpg"): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL);
  if (signError || !data) throw signError ?? new Error("URL indisponible");
  return data.signedUrl;
}
