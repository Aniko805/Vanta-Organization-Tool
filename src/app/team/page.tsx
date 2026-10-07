"use client";

import AppShell, {
  EmptyState,
  ErrorText,
  FieldInput,
  Label,
  Panel,
  PrimaryButton,
  SecondaryButton,
} from "@/app/components/AppShell";
import { supabase } from "@/lib/supabase";
import {
  createTeam,
  createTeamRole,
  deleteTeamRole,
  joinTeamByInvite,
  leaveTeam,
  listMyTeams,
  listTeamMembers,
  listTeamRoles,
  memberIsAdmin,
  memberCanManageRoleDefinitions,
  regenerateInviteCode,
  removeMember,
  updateTeamRole,
  updateMemberRoles,
} from "@/lib/teams";
import {
  displayNameFromProfile,
  type Team,
  type TeamMember,
  type TeamRole,
} from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type TeamRoleDraft = {
  name: string;
  is_admin: boolean;
  can_manage_tasks: boolean;
  can_manage_members: boolean;
  can_manage_inventory: boolean;
};

type TeamRolePermission = Exclude<keyof TeamRoleDraft, "name">;

const EMPTY_TEAM_ROLE_DRAFT: TeamRoleDraft = {
  name: "",
  is_admin: false,
  can_manage_tasks: false,
  can_manage_members: false,
  can_manage_inventory: false,
};

const TEAM_ROLE_PERMISSIONS: { key: TeamRolePermission; label: string }[] = [
  { key: "is_admin", label: "Admin" },
  { key: "can_manage_tasks", label: "Manage tasks" },
  { key: "can_manage_members", label: "Manage members" },
  { key: "can_manage_inventory", label: "Manage inventory" },
];

export default function TeamPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<TeamMember[]>([]);
  const [roleData, setRoleData] = useState<TeamRole[]>([]);
  const [loadedTeamId, setLoadedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<TeamRoleDraft>(EMPTY_TEAM_ROLE_DRAFT);
  const [roleActionBusy, setRoleActionBusy] = useState(false);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createNumber, setCreateNumber] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const members = loadedTeamId === selectedId ? memberData : [];
  const roles = loadedTeamId === selectedId ? roleData : [];
  const selected = teams.find((t) => t.id === selectedId) ?? null;
  const myMembership = members.find((m) => m.user_id === userId) ?? null;
  const isAdmin = selected && userId ? memberIsAdmin(selected, userId, myMembership) : false;
  const canManageRoleDefinitions =
    selected && userId
      ? memberCanManageRoleDefinitions(selected, userId, myMembership)
      : false;

  const refreshTeams = useCallback(async (uid: string) => {
    const next = await listMyTeams();
    setTeams(next);
    setSelectedId((current) => {
      if (current && next.some((t) => t.id === current)) return current;
      return next[0]?.id ?? null;
    });
    return next;
  }, []);

  const refreshSequence = useRef(0);
  const refreshSelected = useCallback(async (teamId: string) => {
    const requestId = ++refreshSequence.current;
    const [m, r] = await Promise.all([listTeamMembers(teamId), listTeamRoles(teamId)]);
    if (requestId !== refreshSequence.current) return;
    setMemberData(m);
    setRoleData(r);
    setLoadedTeamId(teamId);
  }, []);

  const closeRoleEditor = () => {
    setRoleEditorOpen(false);
    setEditingRoleId(null);
    setRoleDraft(EMPTY_TEAM_ROLE_DRAFT);
    setRoleNotice(null);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) return;
      setUserId(user.id);
      try {
        await refreshTeams(user.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load teams");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshTeams]);

  useEffect(() => {
    let mounted = true;
    if (!selectedId) return;
    refreshSelected(selectedId).catch((e) => {
      if (mounted) {
        setError(e instanceof Error ? e.message : "Failed to load members");
      }
    });
    return () => {
      mounted = false;
    };
  }, [selectedId, refreshSelected]);

  const handleCreate = async () => {
    if (!userId || !createName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const team = await createTeam({
        name: createName,
        teamNumber: createNumber,
        ownerId: userId,
      });
      setCreateName("");
      setCreateNumber("");
      closeRoleEditor();
      await refreshTeams(userId);
      setSelectedId(team.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!userId || !inviteCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const tid = await joinTeamByInvite(inviteCode);
      setInviteCode("");
      closeRoleEditor();
      await refreshTeams(userId);
      setSelectedId(tid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Join failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!userId || !selected) return;
    if (selected.owner_id === userId) {
      setError("Owner cannot leave. Transfer ownership or delete the team.");
      return;
    }
    setBusy(true);
    try {
      await leaveTeam(selected.id);
      closeRoleEditor();
      await refreshTeams(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Leave failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRegen = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const code = await regenerateInviteCode(selected.id);
      setTeams((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, invite_code: code } : t))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not regenerate code");
    } finally {
      setBusy(false);
    }
  };

  const openCreateRoleEditor = () => {
    setEditingRoleId(null);
    setRoleDraft(EMPTY_TEAM_ROLE_DRAFT);
    setRoleNotice(null);
    setRoleEditorOpen(true);
  };

  const openEditRoleEditor = (role: TeamRole) => {
    setEditingRoleId(role.id);
    setRoleDraft({
      name: role.name ?? "",
      is_admin: role.is_admin,
      can_manage_tasks: role.can_manage_tasks,
      can_manage_members: role.can_manage_members,
      can_manage_inventory: role.can_manage_inventory,
    });
    setRoleNotice(null);
    setRoleEditorOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selected || !roleDraft.name.trim()) return;
    setRoleActionBusy(true);
    setError(null);
    setRoleNotice(null);
    try {
      if (editingRoleId) {
        await updateTeamRole(editingRoleId, roleDraft);
        setRoleNotice("Role updated.");
      } else {
        await createTeamRole(selected.id, roleDraft);
        setRoleNotice("Role created.");
      }
      await refreshSelected(selected.id);
      setRoleEditorOpen(false);
      setEditingRoleId(null);
      setRoleDraft(EMPTY_TEAM_ROLE_DRAFT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Role could not be saved");
    } finally {
      setRoleActionBusy(false);
    }
  };

  const handleDeleteRole = async (role: TeamRole) => {
    if (!selected) return;
    const roleName = role.name ?? "this role";
    if (
      !window.confirm(
        `Delete ${roleName}? This permanently removes the role and unassigns it from all members and team tasks.`
      )
    ) {
      return;
    }

    setRoleActionBusy(true);
    setError(null);
    setRoleNotice(null);
    try {
      const result = await deleteTeamRole(role.id);
      await refreshSelected(selected.id);
      setRoleNotice(
        `Role deleted. Removed ${result.member_assignments_deleted} member assignments and ${result.task_assignments_deleted} task assignments.`
      );
      if (editingRoleId === role.id) {
        setRoleEditorOpen(false);
        setEditingRoleId(null);
        setRoleDraft(EMPTY_TEAM_ROLE_DRAFT);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Role could not be deleted");
    } finally {
      setRoleActionBusy(false);
    }
  };

  // Dropdown Change Handler
  const handleDropdownRoleChange = async (
    memberId: string,
    currentRoleIds: string[],
    indexToUpdate: number,
    newRoleId: string
  ) => {
    if (!selected) return;

    try {
      setUpdatingMemberId(memberId);
      const updated = [...currentRoleIds];

      if (newRoleId === "") {
        // Remove dropdown selection if empty option chosen
        updated.splice(indexToUpdate, 1);
      } else {
        updated[indexToUpdate] = newRoleId;
      }

      // Deduplicate role IDs
      const uniqueRoleIds = Array.from(new Set(updated.filter(Boolean)));
      await updateMemberRoles(memberId, uniqueRoleIds, selected.id);
      await refreshSelected(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Add Another Dropdown Handler
  const handleAddRoleDropdown = async (memberId: string, currentRoleIds: string[]) => {
    if (!selected) return;

    // Pick the first available role not yet assigned
    const availableRole = roles.find(
      (role) =>
        role.team_id === selected.id && !currentRoleIds.includes(role.id)
    );
    if (!availableRole) return;

    try {
      setUpdatingMemberId(memberId);
      const updated = [...currentRoleIds, availableRole.id];
      await updateMemberRoles(memberId, updated, selected.id);
      await refreshSelected(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Remove Dropdown Handler
  const handleRemoveRoleDropdown = async (
    memberId: string,
    currentRoleIds: string[],
    indexToRemove: number
  ) => {
    if (!selected) return;

    try {
      setUpdatingMemberId(memberId);
      const updated = [...currentRoleIds];
      updated.splice(indexToRemove, 1);

      await updateMemberRoles(memberId, updated, selected.id);
      await refreshSelected(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <AppShell
      eyebrow="Collaboration"
      title="Team"
      actions={
        selected ? (
          <Link
            href={`/team-tasks?team=${selected.id}`}
            className="px-4 py-2 bg-white text-black text-xs font-semibold rounded hover:bg-zinc-200 active:scale-95 transition-all"
          >
            Open Team Tasks
          </Link>
        ) : null
      }
    >
      <ErrorText>{error}</ErrorText>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar Panel */}
        <Panel className="space-y-6">
          <div>
            <Label>Your teams</Label>
            <div className="mt-3 space-y-2">
              {loading ? (
                <EmptyState>Loading…</EmptyState>
              ) : teams.length === 0 ? (
                <EmptyState>No teams yet. Create or join one.</EmptyState>
              ) : (
                teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      closeRoleEditor();
                      setSelectedId(team.id);
                    }}
                    className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                      selectedId === team.id
                        ? "border-zinc-600 bg-zinc-900/60 text-white"
                        : "border-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="font-semibold">{team.name}</span>
                    {team.team_number ? (
                      <span className="ml-2 text-[10px] font-mono text-zinc-500">
                        #{team.team_number}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-4 space-y-3">
            <Label>Create team</Label>
            <FieldInput
              placeholder="Team name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <FieldInput
              placeholder="Team number (FRC/FTC)"
              value={createNumber}
              onChange={(e) => setCreateNumber(e.target.value)}
            />
            <PrimaryButton disabled={busy || !createName.trim()} onClick={handleCreate}>
              Create
            </PrimaryButton>
          </div>

          <div className="border-t border-zinc-900 pt-4 space-y-3">
            <Label>Join with invite code</Label>
            <FieldInput
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <SecondaryButton disabled={busy || !inviteCode.trim()} onClick={handleJoin}>
              Join team
            </SecondaryButton>
          </div>
        </Panel>

        {/* Right Main Details Panel */}
        <Panel className="lg:col-span-2 space-y-6">
          {!selected ? (
            <EmptyState>Select a team to manage members and invites.</EmptyState>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{selected.name}</h2>
                  <p className="text-xs font-mono text-zinc-500 mt-1">
                    {selected.team_number ? `Team #${selected.team_number} · ` : null}
                    Owner session {selected.owner_id === userId ? "(you)" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <SecondaryButton disabled={busy} onClick={handleLeave}>
                    Leave
                  </SecondaryButton>
                </div>
              </div>

              {/* Invite Code Box */}
              <div className="p-4 border border-zinc-900 rounded-lg bg-black/40 space-y-2">
                <Label>Invite code</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <code className="text-sm font-mono text-emerald-400 tracking-wider">
                    {selected.invite_code}
                  </code>
                  <SecondaryButton
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selected.invite_code);
                      } catch {
                        setError("Failed to copy, please copy manually.");
                      }
                    }}
                  >
                    Copy
                  </SecondaryButton>
                  {isAdmin ? (
                    <SecondaryButton disabled={busy} onClick={handleRegen}>
                      Regenerate
                    </SecondaryButton>
                  ) : null}
                </div>
                <p className="text-[10px] font-mono text-zinc-600">
                  Share this code with teammates so they can join from this page.
                </p>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Label>Team roles</Label>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Roles control member access to team tools.
                    </p>
                  </div>
                  {canManageRoleDefinitions && !roleEditorOpen ? (
                    <PrimaryButton
                      type="button"
                      disabled={roleActionBusy}
                      onClick={openCreateRoleEditor}
                    >
                      Create role
                    </PrimaryButton>
                  ) : null}
                </div>

                {roleNotice ? (
                  <p role="status" className="mt-3 text-xs text-emerald-400">
                    {roleNotice}
                  </p>
                ) : null}

                {selectedId !== loadedTeamId ? (
                  <div className="mt-3">
                    <EmptyState>Loading team roles...</EmptyState>
                  </div>
                ) : roles.length === 0 ? (
                  <div className="mt-3">
                    <EmptyState>No roles are defined for this team.</EmptyState>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roles.map((role) => {
                      const permissions = [
                        role.is_admin ? "Admin" : null,
                        role.can_manage_tasks ? "Tasks" : null,
                        role.can_manage_members ? "Members" : null,
                        role.can_manage_inventory ? "Inventory" : null,
                      ].filter(Boolean);

                      return (
                        <div
                          key={role.id}
                          className="border border-zinc-900 rounded bg-zinc-950/40 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-zinc-200">
                                {role.name ?? "Unnamed role"}
                              </h3>
                              <p className="mt-1 text-[11px] text-zinc-500">
                                {permissions.length > 0
                                  ? permissions.join(" · ")
                                  : "No management permissions"}
                              </p>
                            </div>
                            {canManageRoleDefinitions ? (
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  disabled={roleActionBusy}
                                  onClick={() => openEditRoleEditor(role)}
                                  className="text-xs text-zinc-400 hover:text-white disabled:opacity-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={roleActionBusy}
                                  onClick={() => handleDeleteRole(role)}
                                  className="text-xs text-zinc-500 hover:text-red-400 disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {roleEditorOpen && canManageRoleDefinitions ? (
                  <div className="mt-4 border border-zinc-800 rounded bg-black/40 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <Label>{editingRoleId ? "Edit role" : "Create role"}</Label>
                      <SecondaryButton
                        type="button"
                        disabled={roleActionBusy}
                        onClick={closeRoleEditor}
                      >
                        Cancel
                      </SecondaryButton>
                    </div>

                    <FieldInput
                      placeholder="Role name"
                      value={roleDraft.name}
                      maxLength={60}
                      disabled={roleActionBusy}
                      onChange={(e) =>
                        setRoleDraft((current) => ({
                          ...current,
                          name: e.target.value,
                        }))
                      }
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TEAM_ROLE_PERMISSIONS.map((permission) => (
                        <label
                          key={permission.key}
                          className="flex items-center gap-2 border border-zinc-900 rounded px-3 py-2 text-xs text-zinc-300"
                        >
                          <input
                            type="checkbox"
                            checked={roleDraft[permission.key]}
                            disabled={roleActionBusy}
                            onChange={(e) =>
                              setRoleDraft((current) => ({
                                ...current,
                                [permission.key]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 accent-emerald-400"
                          />
                          {permission.label}
                        </label>
                      ))}
                    </div>

                    <PrimaryButton
                      type="button"
                      disabled={roleActionBusy || !roleDraft.name.trim()}
                      onClick={handleSaveRole}
                    >
                      {roleActionBusy ? "Saving..." : "Save role"}
                    </PrimaryButton>
                  </div>
                ) : null}
              </div>

              {/* Members Section with Multi-Dropdowns */}
              <div>
                <Label>Members</Label>
                <div className="mt-3 divide-y divide-zinc-900 border border-zinc-900 rounded-lg overflow-hidden">
                  {members.map((member) => {
                    const assignedRoleIds = member.role_ids ?? [];
                    const selectedTeamRoles = roles.filter(
                      (role) => role.team_id === selected.id
                    );

                    const hasAvailableRoles =
                      assignedRoleIds.length < selectedTeamRoles.length;

                    return (
                      <div
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-zinc-950/30"
                      >
                        {/* Member Identity & Role Badges */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-200">
                              {displayNameFromProfile(member.profiles)}
                            </span>
                            {member.user_id === userId ? (
                              <span className="text-[10px] font-mono text-zinc-500">you</span>
                            ) : null}
                            {member.user_id === selected.owner_id ? (
                              <span className="text-[10px] font-mono text-emerald-500">
                                OWNER
                              </span>
                            ) : null}
                          </div>

                          {/* Active Role Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {member.team_roles_list && member.team_roles_list.length > 0 ? (
                              member.team_roles_list.map((r) => (
                                <span
                                  key={r.id}
                                  className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/50"
                                >
                                  {r.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-600">
                                {member.team_roles?.name ?? "No role"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions: Dynamic Dropdowns & Add Button */}
                        <div className="flex items-center gap-4">
                          {isAdmin ? (
                            <div className="flex flex-col gap-2 border-l border-zinc-900 pl-4">
                              {/* Stacked Dropdowns */}
                              <div className="flex flex-col gap-2">
                                {assignedRoleIds.length === 0 ? (
                                  <FieldInput
                                    as="select"
                                    className="w-36 text-xs"
                                    value=""
                                    disabled={updatingMemberId === member.id}
                                    onChange={(e) =>
                                      handleDropdownRoleChange(
                                        member.id,
                                        [],
                                        0,
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="">No role</option>
                                    {selectedTeamRoles.map((role) => (
                                      <option key={role.id} value={role.id}>
                                        {role.name}
                                      </option>
                                    ))}
                                  </FieldInput>
                                ) : (
                                  assignedRoleIds.map((currentRoleId, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                      <FieldInput
                                        as="select"
                                        className="w-36 text-xs"
                                        value={currentRoleId}
                                        disabled={updatingMemberId === member.id}
                                        onChange={(e) =>
                                          handleDropdownRoleChange(
                                            member.id,
                                            assignedRoleIds,
                                            idx,
                                            e.target.value
                                          )
                                        }
                                      >
                                        <option value="">No role</option>
                                        {selectedTeamRoles.map((role) => (
                                          <option key={role.id} value={role.id}>
                                            {role.name}
                                          </option>
                                        ))}
                                      </FieldInput>

                                      <button
                                        type="button"
                                        title="Remove role"
                                        disabled={updatingMemberId === member.id}
                                        onClick={() =>
                                          handleRemoveRoleDropdown(
                                            member.id,
                                            assignedRoleIds,
                                            idx
                                          )
                                        }
                                        className="text-zinc-500 hover:text-red-400 p-1 text-xs transition-colors"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* "+ Add role" button */}
                              {hasAvailableRoles && assignedRoleIds.length > 0 && (
                                <button
                                  type="button"
                                  disabled={updatingMemberId === member.id}
                                  onClick={() =>
                                    handleAddRoleDropdown(member.id, assignedRoleIds)
                                  }
                                  className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 text-left transition-colors"
                                >
                                  + Add another role
                                </button>
                              )}
                            </div>
                          ) : null}

                          {isAdmin && member.user_id !== selected.owner_id ? (
                            <SecondaryButton
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    "Are you sure you want to remove this member from the team?"
                                  )
                                )
                                  return;
                                try {
                                  await removeMember(member.id);
                                  await refreshSelected(selected.id);
                                } catch (err) {
                                  setError(
                                    err instanceof Error ? err.message : "Remove failed"
                                  );
                                }
                              }}
                            >
                              Remove
                            </SecondaryButton>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}