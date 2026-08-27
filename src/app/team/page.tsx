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
  joinTeamByInvite,
  leaveTeam,
  listMyTeams,
  listTeamMembers,
  listTeamRoles,
  memberIsAdmin,
  regenerateInviteCode,
  removeMember,
  updateMemberRoles,
  deleteTeam,
} from "@/lib/teams";
import {
  displayNameFromProfile,
  type Team,
  type TeamMember,
  type TeamRole,
} from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function TeamPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createNumber, setCreateNumber] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const selected = teams.find((t) => t.id === selectedId) ?? null;
  const myMembership = members.find((m) => m.user_id === userId) ?? null;
  const isAdmin = selected && userId ? memberIsAdmin(selected, userId, myMembership) : false;

  const refreshTeams = useCallback(async (uid: string) => {
    const next = await listMyTeams();
    setTeams(next);
    setSelectedId((current) => {
      if (current && next.some((t) => t.id === current)) return current;
      return next[0]?.id ?? null;
    });
    return next;
  }, []);

  const refreshSelected = useCallback(async (teamId: string) => {
    const [m, r] = await Promise.all([listTeamMembers(teamId), listTeamRoles(teamId)]);
    setMembers(m);
    setRoles(r);
  }, []);

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
    if (!selectedId) {
      setMembers([]);
      setRoles([]);
      return;
    }
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

  const handleRoleToggle = async (
    memberId: string,
    roleId: string,
    currentRoleIds: string[]
  ) => {
    if (!selected) return;

    try {
      setUpdatingMemberId(memberId);
      const newRoleIds = currentRoleIds.includes(roleId)
        ? currentRoleIds.filter((id) => id !== roleId)
        : [...currentRoleIds, roleId];

      await updateMemberRoles(memberId, newRoleIds);
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
                    onClick={() => setSelectedId(team.id)}
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

              {/* Members Section (Updated with multi-role support) */}
              <div>
                <Label>Members</Label>
                <div className="mt-3 divide-y divide-zinc-900 border border-zinc-900 rounded-lg overflow-hidden">
                  {members.map((member) => {
                    const assignedRoleIds = member.role_ids ?? (member.role_id ? [member.role_id] : []);

                    return (
                      <div
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-zinc-950/30"
                      >
                        {/* Member Identity & Assigned Role Badges */}
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

                          {/* Role Pills */}
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

                        {/* Actions (Role Checkboxes & Remove Button) */}
                        <div className="flex items-center gap-4">
                          {isAdmin ? (
                            <div className="flex items-center gap-3 border-l border-zinc-900 pl-4">
                              <span className="text-[11px] font-semibold text-zinc-400">
                                Assign Roles:
                              </span>
                              <div className="flex flex-wrap gap-2.5">
                                {roles.map((role) => {
                                  const isChecked = assignedRoleIds.includes(role.id);
                                  return (
                                    <label
                                      key={role.id}
                                      className="flex items-center space-x-1.5 text-xs text-zinc-300 cursor-pointer select-none hover:text-white"
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
                                        className="rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-0 focus:ring-offset-0"
                                      />
                                      <span>{role.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
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