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
  // Fetch members with profiles
  const { data: rawMembers, error: memberError } = await supabase
    .from("team_members")
    .select(`*, profiles(*)`)
    .eq("team_id", teamId);

  if (memberError) throw new Error(memberError.message);
  if (!rawMembers || rawMembers.length === 0) return [];

  // Fetch all roles for this team
  const roles = await listTeamRoles(teamId);
  const roleById = new Map(roles.map((r) => [r.id, r]));

  // Fetch multi-role assignments from member_roles join table
  const memberIds = rawMembers.map((m) => m.id);
  const { data: roleLinks, error: roleLinksError } = await supabase
    .from("member_roles")
    .select("member_id, role_id")
    .in("member_id", memberIds);

  if (roleLinksError) throw new Error(roleLinksError.message);

  const rolesByMemberId = new Map<string, string[]>();
  (roleLinks ?? []).forEach((link) => {
    if (!roleById.has(link.role_id)) return;
    const list = rolesByMemberId.get(link.member_id) ?? [];
    list.push(link.role_id);
    rolesByMemberId.set(link.member_id, list);
  });

  return rawMembers.map((m) => {
    const assignedIds = rolesByMemberId.get(m.id) ?? [];
    const assignedRoles = assignedIds
      .map((id) => roleById.get(id))
      .filter((r): r is TeamRole => Boolean(r));

    return {
      ...m,
      role_ids: assignedIds,
      team_roles_list: assignedRoles,
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

export type TeamRoleInput = Omit<
  Pick<
    TeamRole,
    | "name"
    | "is_admin"
    | "can_manage_tasks"
    | "can_manage_members"
    | "can_manage_inventory"
  >,
  "name"
> & { name: string };

export type DeleteTeamRoleResult = {
  member_assignments_deleted: number;
  task_assignments_deleted: number;
};

export async function createTeamRole(
  teamId: string,
  role: TeamRoleInput
): Promise<TeamRole> {
  const { data, error } = await supabase.rpc("create_team_role", {
    p_team_id: teamId,
    p_name: role.name.trim(),
    p_is_admin: role.is_admin,
    p_can_manage_tasks: role.can_manage_tasks,
    p_can_manage_members: role.can_manage_members,
    p_can_manage_inventory: role.can_manage_inventory,
  });

  if (error) throw new Error(error.message);
  return data as TeamRole;
}

export async function updateTeamRole(
  roleId: string,
  role: TeamRoleInput
): Promise<TeamRole> {
  const { data, error } = await supabase.rpc("update_team_role", {
    p_role_id: roleId,
    p_name: role.name.trim(),
    p_is_admin: role.is_admin,
    p_can_manage_tasks: role.can_manage_tasks,
    p_can_manage_members: role.can_manage_members,
    p_can_manage_inventory: role.can_manage_inventory,
  });

  if (error) throw new Error(error.message);
  return data as TeamRole;
}

export async function deleteTeamRole(
  roleId: string
): Promise<DeleteTeamRoleResult> {
  const { data, error } = await supabase.rpc("delete_team_role", {
    p_role_id: roleId,
  });

  if (error) throw new Error(error.message);
  return data as DeleteTeamRoleResult;
}

export async function updateMemberRoles(
  memberId: string,
  roleIds: string[],
  teamId: string
): Promise<void> {
  const uniqueRoleIds = Array.from(new Set(roleIds));
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("id", memberId)
    .single();

  if (memberError) throw new Error(memberError.message);
  if (member.team_id !== teamId) {
    throw new Error("Member does not belong to the selected team");
  }

  if (uniqueRoleIds.length > 0) {
    const { data: validRoles, error: rolesError } = await supabase
      .from("team_roles")
      .select("id")
      .eq("team_id", teamId)
      .in("id", uniqueRoleIds);

    if (rolesError) throw new Error(rolesError.message);
    if ((validRoles ?? []).length !== uniqueRoleIds.length) {
      throw new Error("One or more roles do not belong to the selected team");
    }
  }

  // 1. Clear existing roles in junction table
  const { error: deleteError } = await supabase
    .from("member_roles")
    .delete()
    .eq("member_id", memberId);

  if (deleteError) throw new Error(deleteError.message);

  // 2. Insert new assigned roles
  if (uniqueRoleIds.length > 0) {
    const inserts = uniqueRoleIds.map((roleId) => ({
      member_id: memberId,
      role_id: roleId,
    }));
    const { error: insertError } = await supabase
      .from("member_roles")
      .insert(inserts);

    if (insertError) throw new Error(insertError.message);
  }
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
  if (membership?.team_roles_list?.some((r) => r.is_admin || r.can_manage_members)) {
    return true;
  }
  const role = membership?.team_roles;
  return Boolean(role?.is_admin || role?.can_manage_members);
}

export function memberCanManageRoleDefinitions(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  const roles = membership?.team_roles_list ?? [];
  if (roles.some((role) => role.team_id === team.id && role.is_admin)) return true;
  const role = membership?.team_roles;
  return Boolean(role?.team_id === team.id && role.is_admin);
}

export function memberCanManageTasks(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  if (membership?.team_roles_list?.some((r) => r.is_admin || r.can_manage_tasks)) {
    return true;
  }
  const role = membership?.team_roles;
  return Boolean(role?.is_admin || role?.can_manage_tasks);
}

export function memberCanManageInventory(
  team: Team,
  userId: string,
  membership?: TeamMember | null
): boolean {
  if (team.owner_id === userId) return true;
  if (membership?.team_roles_list?.some((r) => r.is_admin || r.can_manage_inventory)) {
    return true;
  }
  const role = membership?.team_roles;
  return Boolean(role?.is_admin || role?.can_manage_inventory);
}