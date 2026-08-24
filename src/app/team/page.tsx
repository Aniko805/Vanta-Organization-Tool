"use client";

import { useEffect, useState } from "react";
import {
  listMyTeams,
  listTeamMembers,
  listTeamRoles,
  updateMemberRoles,
  removeMember,
  regenerateInviteCode,
  deleteTeam,
} from "@/lib/teams";
import type { Team, TeamMember, TeamRole } from "@/lib/types";

export default function TeamManagementPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // UI state
  const [inviteCode, setInviteCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const myTeams = await listMyTeams();
        if (myTeams.length === 0) {
          setLoading(false);
          return;
        }

        const activeTeam = myTeams[0];
        setTeam(activeTeam);
        setInviteCode(activeTeam.invite_code);

        const [fetchedMembers, fetchedRoles] = await Promise.all([
          listTeamMembers(activeTeam.id),
          listTeamRoles(activeTeam.id),
        ]);

        setMembers(fetchedMembers);
        setRoles(fetchedRoles);
      } catch (err: any) {
        console.error("Error loading team page:", err);
        setErrorMsg(err?.message || "Failed to load team settings.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleRoleToggle = async (
    memberId: string,
    roleId: string,
    currentRoleIds: string[]
  ) => {
    if (!team) return;

    try {
      setUpdatingMemberId(memberId);

      const newRoleIds = currentRoleIds.includes(roleId)
        ? currentRoleIds.filter((id) => id !== roleId)
        : [...currentRoleIds, roleId];

      await updateMemberRoles(memberId, newRoleIds);

      const updatedMembers = await listTeamMembers(team.id);
      setMembers(updatedMembers);
    } catch (err: any) {
      alert(err?.message || "Failed to update member roles.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team || !confirm("Are you sure you want to remove this member?")) return;

    try {
      await removeMember(memberId);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err: any) {
      alert(err?.message || "Failed to remove member.");
    }
  };

  const handleRegenerateCode = async () => {
    if (!team) return;

    try {
      const newCode = await regenerateInviteCode(team.id);
      setInviteCode(newCode);
      setTeam({ ...team, invite_code: newCode });
    } catch (err: any) {
      alert(err?.message || "Failed to generate new invite code.");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteTeam = async () => {
    if (
      !team ||
      !confirm(
        "Are you sure you want to delete this team? This action cannot be undone."
      )
    )
      return;

    try {
      await deleteTeam(team.id);
      window.location.href = "/";
    } catch (err: any) {
      alert(err?.message || "Failed to delete team.");
    }
  };

  if (loading) {
    return <div className="p-8 text-zinc-400">Loading team settings...</div>;
  }

  if (errorMsg) {
    return <div className="p-8 text-red-400">{errorMsg}</div>;
  }

  if (!team) {
    return (
      <div className="p-8 text-zinc-400">
        No team found. Please create or join a team first.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          {team.team_number && (
            <p className="text-sm text-zinc-400 mt-1">
              Team #{team.team_number}
            </p>
          )}
        </div>
        <button
          onClick={handleDeleteTeam}
          className="px-4 py-2 text-sm font-medium text-red-400 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded-md transition"
        >
          Delete Team
        </button>
      </div>

      {/* Invite Code Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-200">Team Invite Code</h2>
        <p className="text-sm text-zinc-400">
          Share this code with teammates to allow them to join your organization.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <code className="bg-zinc-950 border border-zinc-800 text-amber-400 font-mono px-4 py-2 rounded-md text-base tracking-widest">
            {inviteCode}
          </code>
          <button
            onClick={handleCopyCode}
            className="px-3 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 rounded-md transition"
          >
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            onClick={handleRegenerateCode}
            className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-200">
            Members ({members.length})
          </h2>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {members.map((member) => {
            const assignedRoleIds = member.role_ids ?? [];
            const displayName =
              member.profiles?.full_name ||
              member.profiles?.display_name ||
              member.profiles?.first_name ||
              "Unknown Member";

            return (
              <div
                key={member.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Member Info & Role Badges */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-zinc-100">{displayName}</p>
                    {member.user_id === team.owner_id && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                        Owner
                      </span>
                    )}
                  </div>
                  {member.profiles?.email && (
                    <p className="text-xs text-zinc-400">
                      {member.profiles.email}
                    </p>
                  )}

                  {/* Active Role Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {member.team_roles_list &&
                    member.team_roles_list.length > 0 ? (
                      member.team_roles_list.map((role) => (
                        <span
                          key={role.id}
                          className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60"
                        >
                          {role.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-500">
                        No assigned roles
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Toggles & Actions */}
                <div className="flex items-center gap-6 border-t md:border-t-0 border-zinc-800 pt-3 md:pt-0">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-zinc-400">
                      Assign Roles:
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {roles.map((role) => {
                        const isChecked = assignedRoleIds.includes(role.id);
                        return (
                          <label
                            key={role.id}
                            className="flex items-center space-x-2 text-sm text-zinc-300 cursor-pointer select-none hover:text-zinc-100"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={updatingMemberId === member.id}
                              onChange={() =>
                                handleRoleToggle(
                                  member.id,
                                  role.id,
                                  assignedRoleIds
                                )
                              }
                              className="accent-blue-600 rounded bg-zinc-950 border-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                            />
                            <span>{role.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {member.user_id !== team.owner_id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-xs font-medium text-red-400 hover:text-red-300 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}