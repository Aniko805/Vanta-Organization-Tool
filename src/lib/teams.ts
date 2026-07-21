import { supabase } from "./supabase";
import type { Team, TeamMember, TeamRole } from "./types";

export async function listMyTeams(): Promise<Team[]> {
  const { data: memberships, error: memberError } = await supabase
    .from("team_members")
    .select("team_id");

  if (memberError) throw new Error(memberError.message);

  const ids = [...new Set((memberships ?? []).map((m) => m.team_id))];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Team[];
}

export async function createTeam(input: {
  name: string;
  teamNumber?: string;
  ownerId: string;
}): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: input.name.trim(),
      team_number: input.teamNumber?.trim() || null,
      owner_id: input.ownerId,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Team;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Team | null;
}

export async function joinTeamByInvite(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_team_by_invite", {
    p_code: code.trim(),
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*, profiles(*), team_roles(*)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMember[];
}

export async function listTeamRoles(teamId: string): Promise<TeamRole[]> {
  const { data, error } = await supabase
    .from("team_roles")
    .select("*")
    .eq("team_id", teamId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TeamRole[];
}

export async function updateMemberRole(
  memberId: string,
  roleId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("team_members")
    .update({ role_id: roleId })
    .eq("id", memberId);

  if (error) throw new Error(error.message);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function regenerateInviteCode(teamId: string): Promise<string> {
  const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data, error } = await supabase
    .from("teams")
    .update({ invite_code: code })
    .eq("id", teamId)
    .select("invite_code")
    .single();

  if (error) throw new Error(error.message);
  return data.invite_code as string;
}

export function memberIsAdmin(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  const role = membership?.team_roles;
  return Boolean(role?.is_admin || role?.can_manage_members);
}

export function memberCanManageTasks(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  const role = membership?.team_roles;
  return Boolean(role?.is_admin || role?.can_manage_tasks);
}

export function memberCanManageInventory(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  const role = membership?.team_roles;
  if (!membership?.role_id) return true;
  return Boolean(role?.is_admin || role?.can_manage_inventory);
}
