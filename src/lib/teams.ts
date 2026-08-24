import { supabase } from "./supabase";
import type { Team, TeamMember, TeamRole } from "./types";

export async function listMyTeams(): Promise<Team[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error: memberError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);

  if (memberError) throw new Error(memberError.message);

  const teamIdSet = new Set<string>();
  (memberships ?? []).forEach((m) => teamIdSet.add(m.team_id));
  const ids = Array.from(teamIdSet);
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

export async function leaveTeam(teamId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("owner_id")
    .eq("id", teamId)
    .single();

  if (teamError) throw new Error(teamError.message);
  if (!team) throw new Error("Team not found");
  if (team.owner_id === user.id) {
    throw new Error(
      "Owner cannot leave the team. Transfer ownership or delete the team."
    );
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data: members, error } = await supabase
    .from("team_members")
    .select(`*, profiles(*)`)
    .eq("team_id", teamId);

  if (error) throw new Error(error.message);

  const memberIds = (members ?? []).map((m) => m.id);

  let memberRolesRows: { member_id: string; role_id: string }[] = [];
  if (memberIds.length > 0) {
    const { data: mrData, error: mrError } = await supabase
      .from("member_roles")
      .select("member_id, role_id")
      .in("member_id", memberIds);

    if (mrError) throw new Error(mrError.message);
    if (mrData) memberRolesRows = mrData;
  }

  const roles = await listTeamRoles(teamId);
  const roleById = new Map(roles.map((r) => [r.id, r]));

  // Build a map of member_id -> array of assigned role_ids
  const memberToRoleIdsMap = new Map<string, string[]>();
  for (const mr of memberRolesRows) {
    const list = memberToRoleIdsMap.get(mr.member_id) ?? [];
    list.push(mr.role_id);
    memberToRoleIdsMap.set(mr.member_id, list);
  }

  return (members ?? []).map((m) => {
    const activeRoleIds = memberToRoleIdsMap.get(m.id) ?? [];
    const assignedRoles = activeRoleIds
      .map((id) => roleById.get(id))
      .filter((r): r is TeamRole => Boolean(r));

    return {
      ...m,
      role_ids: activeRoleIds,
      team_roles_list: assignedRoles,
      // Fallback property for single-role backwards compatibility
      team_roles: assignedRoles[0] ?? null,
    };
  }) as TeamMember[];
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

export async function updateMemberRoles(
  memberId: string,
  roleIds: string[]
): Promise<void> {
  // 1. Remove all current role associations for this member
  const { error: deleteError } = await supabase
    .from("member_roles")
    .delete()
    .eq("member_id", memberId);

  if (deleteError) throw new Error(deleteError.message);

  // 2. Insert rows for each provided role_id (filtering out duplicates or empty values)
  const validRoleIds = Array.from(new Set(roleIds.filter(Boolean)));

  if (validRoleIds.length > 0) {
    const rowsToInsert = validRoleIds.map((roleId) => ({
      member_id: memberId,
      role_id: roleId,
    }));

    const { error: insertError } = await supabase
      .from("member_roles")
      .insert(rowsToInsert);

    if (insertError) throw new Error(insertError.message);
  }
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId);
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

export async function deleteTeam(teamId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("owner_id")
    .eq("id", teamId)
    .single();

  if (teamError) throw new Error(teamError.message);
  if (!team) throw new Error("Team not found");
  if (team.owner_id !== user.id) {
    throw new Error("Only the owner can delete the team");
  }

  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);
}

export function memberIsAdmin(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  const roles = membership?.team_roles_list ?? (membership?.team_roles ? [membership.team_roles] : []);
  return roles.some((role) => role.is_admin || role.can_manage_members);
}

export function memberCanManageTasks(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  const roles = membership?.team_roles_list ?? (membership?.team_roles ? [membership.team_roles] : []);
  return roles.some((role) => role.is_admin || role.can_manage_tasks);
}

export function memberCanManageInventory(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  const roles = membership?.team_roles_list ?? (membership?.team_roles ? [membership.team_roles] : []);
  if (roles.length === 0) return true;
  return roles.some((role) => role.is_admin || role.can_manage_inventory);
}