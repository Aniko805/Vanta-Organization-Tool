"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getTeam,
  listTeamMembers,
  listTeamRoles,
  updateMemberRoles, // Updated function to accept an array of role IDs
  memberIsAdmin,
} from "@/lib/teams";
import type { Team, TeamMember, TeamRole } from "@/lib/types";

export default function TeamManagementPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeamData() {
      try {
        setLoading(true);
        const [fetchedTeam, fetchedMembers, fetchedRoles] = await Promise.all([
          getTeam(teamId),
          listTeamMembers(teamId),
          listTeamRoles(teamId),
        ]);

        setTeam(fetchedTeam);
        setMembers(fetchedMembers);
        setRoles(fetchedRoles);
      } catch (err) {
        console.error("Failed to load team data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (teamId) loadTeamData();
  }, [teamId]);

  const handleRoleToggle = async (memberId: string, roleId: string, currentRoleIds: string[]) => {
    try {
      setUpdatingMemberId(memberId);
      
      // Toggle role ID in array
      const newRoleIds = currentRoleIds.includes(roleId)
        ? currentRoleIds.filter((id) => id !== roleId)
        : [...currentRoleIds, roleId];

      // Call API helper to update multiple roles
      await updateMemberRoles(memberId, newRoleIds);

      // Refresh local list state
      const updatedMembers = await listTeamMembers(teamId);
      setMembers(updatedMembers);
    } catch (err) {
      console.error("Failed to update roles:", err);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  if (loading) return <div className="p-6">Loading team settings...</div>;
  if (!team) return <div className="p-6">Team not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{team.name} - Member Roles</h1>

      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Team Members</h2>

        <div className="divide-y">
          {members.map((member) => {
            const assignedRoleIds = member.role_ids ?? [];

            return (
              <div key={member.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {member.profiles?.full_name || member.profiles?.display_name || "Unknown Member"}
                  </p>
                  <p className="text-sm text-gray-500">{member.profiles?.email}</p>
                  
                  {/* Badges displaying assigned roles */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {member.team_roles_list && member.team_roles_list.length > 0 ? (
                      member.team_roles_list.map((r) => (
                        <span
                          key={r.id}
                          className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                        >
                          {r.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No assigned roles</span>
                    )}
                  </div>
                </div>

                {/* Role selection UI (Checkboxes for multi-role assignment) */}
                <div className="flex flex-col gap-2 border-l pl-4">
                  <span className="text-xs font-semibold text-gray-500">Assign Roles:</span>
                  <div className="flex flex-wrap gap-3">
                    {roles.map((role) => {
                      const isChecked = assignedRoleIds.includes(role.id);
                      return (
                        <label
                          key={role.id}
                          className="flex items-center space-x-1.5 text-sm cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={updatingMemberId === member.id}
                            onChange={() => handleRoleToggle(member.id, role.id, assignedRoleIds)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{role.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}