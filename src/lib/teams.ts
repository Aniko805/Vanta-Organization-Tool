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

  // Extract unique team IDs
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

  // Check if the user is the owner of the team
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

  // Query member_roles for all members in this team
  let memberRolesRows: { member_id: string; role_id: string }[] = [];
  if (memberIds.length > 0) {
    const { data: mrData, error: mrError } = await supabase
      .from("member_roles")
      .select("member_id, role_id")
      .in("member_id", memberIds);

    if (mrError) throw new Error(mrError.message);
    if (mrData) memberRolesRows = mrData;
  }

  // Fetch available roles for the team
  const roles = await listTeamRoles(teamId);
  const roleById = new Map(roles.map((r) => [r.id, r]));

  // Create a map from member_id -> role_id
  const memberToRoleMap = new Map(
    memberRolesRows.map((mr) => [mr.member_id, mr.role_id])
  );

  return (members ?? []).map((m) => {
    const activeRoleId = memberToRoleMap.get(m.id) ?? null;
    return {
      ...m,
      role_id: activeRoleId,
      team_roles: activeRoleId ? roleById.get(activeRoleId) ?? null : null,
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

export async function updateMemberRole(
  memberId: string,
  roleId: string | null
): Promise<void> {
  // 1. Delete any existing role assignment in member_roles for this member
  const { error: deleteError } = await supabase
    .from("member_roles")
    .delete()
    .eq("member_id", memberId);

  if (deleteError) throw new Error(deleteError.message);

  // 2. If a new role ID is provided, insert a new row in member_roles
  if (roleId) {
    const { error: insertError } = await supabase
      .from("member_roles")
      .insert({
        member_id: memberId,
        role_id: roleId,
      });

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

  // Verify ownership
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

  // Delete the team (cascading deletes will remove related data)
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);
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