import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./basket";
import { emailSchema, inviteCodeSchema, spaceInputSchema, uuidSchema, validate } from "./validation";

export type SpaceRole = "admin" | "member";

export type Space = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  invite_code_active: boolean;
  created_by: string;
};

export type MySpace = Space & { role: SpaceRole };

export type SpaceMember = {
  user_id: string;
  role: SpaceRole;
  profile: Profile | null;
};

export type SpaceInvite = {
  id: string;
  email: string;
  created_at: string;
};

const SPACE_COLUMNS = "id, name, description, invite_code, invite_code_active, created_by";

/** Espaces dont l'utilisateur est membre, avec son rôle. */
export async function fetchMySpaces(userId: string): Promise<MySpace[]> {
  const { data, error } = await supabase
    .from("space_members")
    .select(`role, space:spaces!inner(${SPACE_COLUMNS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as { role: SpaceRole; space: Space | null }[];
  return rows
    .filter((row): row is { role: SpaceRole; space: Space } => Boolean(row.space))
    .map((row) => ({ ...row.space, role: row.role }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export async function createSpace(name: string, description: string): Promise<Space> {
  const clean = validate(spaceInputSchema, { name, description });
  const { data, error } = await supabase.rpc("create_space", {
    _name: clean.name,
    _description: clean.description,
  });
  if (error) throw error;
  return data as unknown as Space;
}

export async function joinSpaceByCode(code: string): Promise<Space> {
  const clean = validate(inviteCodeSchema, code);
  const { data, error } = await supabase.rpc("join_space_by_code", { _code: clean });
  if (error) throw error;
  return data as unknown as Space;
}

/** Convertit les invitations email en attente en adhésions (à la connexion). */
export async function acceptPendingInvites(): Promise<number> {
  const { data, error } = await supabase.rpc("accept_pending_invites");
  if (error) return 0;
  return (data as number | null) ?? 0;
}

export async function fetchSpace(id: string): Promise<Space | null> {
  const { data, error } = await supabase.from("spaces").select(SPACE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Space) ?? null;
}

export async function fetchSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
  const { data, error } = await supabase
    .from("space_members")
    .select("user_id, role, created_at")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as { user_id: string; role: SpaceRole }[];
  if (rows.length === 0) return [];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, position, avatar_url, matches_played, cancellations")
    .in("id", rows.map((r) => r.user_id));
  if (profileError) throw profileError;
  const byId = new Map((profiles as Profile[]).map((p) => [p.id, p]));
  return rows.map((row) => ({ ...row, profile: byId.get(row.user_id) ?? null }));
}

export async function fetchSpaceInvites(spaceId: string): Promise<SpaceInvite[]> {
  const { data, error } = await supabase
    .from("space_invites")
    .select("id, email, created_at")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SpaceInvite[];
}

export async function inviteByEmail(spaceId: string, email: string, invitedBy: string) {
  const cleanEmail = validate(emailSchema, email);
  validate(uuidSchema, spaceId);
  const { error } = await supabase
    .from("space_invites")
    .insert({ space_id: spaceId, email: cleanEmail, invited_by: invitedBy });
  if (error) throw error;
}

export async function revokeInvite(inviteId: string) {
  const { error } = await supabase.from("space_invites").delete().eq("id", inviteId);
  if (error) throw error;
}

export async function removeMember(spaceId: string, userId: string) {
  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setMemberRole(spaceId: string, userId: string, role: SpaceRole) {
  const { error } = await supabase
    .from("space_members")
    .update({ role })
    .eq("space_id", spaceId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function regenerateInviteCode(spaceId: string): Promise<string> {
  const { data, error } = await supabase.rpc("regenerate_invite_code", { _space: spaceId });
  if (error) throw error;
  return data as unknown as string;
}

export async function setInviteCodeActive(spaceId: string, active: boolean) {
  const { error } = await supabase.from("spaces").update({ invite_code_active: active }).eq("id", spaceId);
  if (error) throw error;
}

export function inviteLink(code: string) {
  return `${window.location.origin}/rejoindre?code=${encodeURIComponent(code)}`;
}
