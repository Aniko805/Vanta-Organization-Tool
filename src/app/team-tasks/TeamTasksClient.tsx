"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell, {
  EmptyState,
  ErrorText,
  FieldInput,
  Label,
  Panel,
  PrimaryButton,
  SecondaryButton,
} from "@/app/components/AppShell";
import { listAssignableParts } from "@/lib/parts";
import { supabase } from "@/lib/supabase";
import {
  listMyTeams,
  listTeamMembers,
  listTeamRoles,
  memberCanManageTasks,
} from "@/lib/teams";
import {
  createSubtask,
  createTask,
  deleteTask,
  listTeamTasks,
  updateSubtaskStatus,
  updateTask,
} from "@/lib/tasks";
import {
  TASK_COLUMNS,
  displayNameFromProfile,
  type Importance,
  type Part,
  type TaskStatus,
  type TaskWithRelations,
  type Team,
  type TeamMember,
  type TeamRole,
} from "@/lib/types";

export default function TeamTasksClient() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<Importance>("medium");
  const [category, setCategory] = useState("");
  const [competitionStatus, setCompetitionStatus] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [partIds, setPartIds] = useState<string[]>([]);
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});

  const selectedTeam = teams.find((t) => t.id === teamId) ?? null;
  const myMembership = members.find((m) => m.user_id === userId) ?? null;
  const canManage =
    selectedTeam && userId
      ? memberCanManageTasks(selectedTeam, userId, myMembership)
      : false;

  const refresh = useCallback(async (tid: string) => {
    const [t, m, r, p] = await Promise.all([
      listTeamTasks(tid),
      listTeamMembers(tid),
      listTeamRoles(tid),
      listAssignableParts(tid),
    ]);
    setTasks(t);
    setMembers(m);
    setRoles(r);
    setParts(p);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setUserId(user.id);
      try {
        const myTeams = await listMyTeams();
        if (!mounted) return;
        setTeams(myTeams);
        const fromQuery = searchParams.get("team");
        const initial =
          (fromQuery && myTeams.find((t) => t.id === fromQuery)?.id) ||
          myTeams[0]?.id ||
          null;
        setTeamId(initial);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!teamId) return;
    refresh(teamId).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load tasks")
    );
  }, [teamId, refresh]);

  const columns = useMemo(() => {
    return TASK_COLUMNS.map((col) => ({
      ...col,
      items: tasks.filter((t) => t.status === col.id),
    }));
  }, [tasks]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setImportance("medium");
    setCategory("");
    setCompetitionStatus("");
    setDueDate("");
    setAssigneeIds([]);
    setRoleIds([]);
    setPartIds([]);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!userId || !teamId || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createTask({
        name,
        description,
        importance,
        category,
        competition_status: competitionStatus,
        due_date: dueDate || null,
        team_id: teamId,
        is_personal: false,
        created_by: userId,
        assigneeIds,
        roleIds,
        partIds,
      });
      resetForm();
      await refresh(teamId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleId = (list: string[], id: string, set: (v: string[]) => void) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  return (
    <AppShell
      eyebrow="Operations"
      title="Team Tasks"
      actions={
        <>
          <FieldInput
            as="select"
            className="w-48"
            value={teamId ?? ""}
            onChange={(e) => setTeamId(e.target.value || null)}
          >
            {teams.length === 0 ? <option value="">No teams</option> : null}
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FieldInput>
          {canManage ? (
            <PrimaryButton onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Close" : "New task"}
            </PrimaryButton>
          ) : null}
        </>
      }
    >
      <ErrorText>{error}</ErrorText>

      {!teamId ? (
        <Panel>
          <EmptyState>Create or join a team first, then return here.</EmptyState>
        </Panel>
      ) : (
        <>
          {showForm && canManage ? (
            <Panel className="space-y-4">
              <Label>New team task</Label>
              <FieldInput
                placeholder="Task name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldInput
                as="textarea"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldInput
                  as="select"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value as Importance)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </FieldInput>
                <FieldInput
                  placeholder="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <FieldInput
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <FieldInput
                placeholder="Competition status"
                value={competitionStatus}
                onChange={(e) => setCompetitionStatus(e.target.value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Assignees</Label>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {members.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          checked={assigneeIds.includes(m.user_id)}
                          onChange={() => toggleId(assigneeIds, m.user_id, setAssigneeIds)}
                        />
                        {displayNameFromProfile(m.profiles)}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Roles</Label>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {roles.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          checked={roleIds.includes(r.id)}
                          onChange={() => toggleId(roleIds, r.id, setRoleIds)}
                        />
                        {r.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Parts</Label>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {parts.length === 0 ? (
                      <EmptyState>No assignable parts</EmptyState>
                    ) : (
                      parts.map((p) => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 text-xs text-zinc-400"
                        >
                          <input
                            type="checkbox"
                            checked={partIds.includes(p.id)}
                            onChange={() => toggleId(partIds, p.id, setPartIds)}
                          />
                          {p.name}
                          {p.sku ? ` (${p.sku})` : ""}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <PrimaryButton disabled={busy || !name.trim()} onClick={handleCreate}>
                Create task
              </PrimaryButton>
            </Panel>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {columns.map((col) => (
              <div key={col.id} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Label>{col.label}</Label>
                  <span className="text-[10px] font-mono text-zinc-600">
                    {col.items.length}
                  </span>
                </div>
                {col.items.length === 0 ? (
                  <Panel>
                    <EmptyState>Empty</EmptyState>
                  </Panel>
                ) : (
                  col.items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canManage={canManage}
                      subtaskDraft={subtaskDrafts[task.id] ?? ""}
                      onDraftChange={(v) =>
                        setSubtaskDrafts((prev) => ({ ...prev, [task.id]: v }))
                      }
                      onStatus={async (status) => {
                        try {
                          await updateTask(task.id, { status });
                          if (teamId) await refresh(teamId);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Update failed");
                        }
                      }}
                      onDelete={async () => {
                        try {
                          await deleteTask(task.id);
                          if (teamId) await refresh(teamId);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Delete failed");
                        }
                      }}
                      onAddSubtask={async () => {
                        const draft = subtaskDrafts[task.id]?.trim();
                        if (!draft) return;
                        try {
                          await createSubtask({ taskId: task.id, name: draft });
                          setSubtaskDrafts((prev) => ({ ...prev, [task.id]: "" }));
                          if (teamId) await refresh(teamId);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Subtask failed");
                        }
                      }}
                      onSubtaskStatus={async (subId, status) => {
                        try {
                          await updateSubtaskStatus(subId, status);
                          if (teamId) await refresh(teamId);
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "Subtask update failed"
                          );
                        }
                      }}
                    />
                  ))
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}

function TaskCard({
  task,
  canManage,
  subtaskDraft,
  onDraftChange,
  onStatus,
  onDelete,
  onAddSubtask,
  onSubtaskStatus,
}: {
  task: TaskWithRelations;
  canManage: boolean;
  subtaskDraft: string;
  onDraftChange: (v: string) => void;
  onStatus: (s: TaskStatus) => void;
  onDelete: () => void;
  onAddSubtask: () => void;
  onSubtaskStatus: (id: string, s: TaskStatus) => void;
}) {
  return (
    <Panel className="space-y-3 !p-4">
      <div className="flex justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{task.name}</h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 shrink-0">
          {task.importance}
        </span>
      </div>
      {task.description ? (
        <p className="text-xs text-zinc-500 leading-relaxed">{task.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {task.category ? (
          <span className="text-[10px] font-mono border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">
            {task.category}
          </span>
        ) : null}
        {task.due_date ? (
          <span className="text-[10px] font-mono border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">
            Due {task.due_date}
          </span>
        ) : null}
        {task.competition_status ? (
          <span className="text-[10px] font-mono border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">
            {task.competition_status}
          </span>
        ) : null}
      </div>
      {task.task_assignees?.length || task.task_role_assignees?.length ? (
        <p className="text-[10px] font-mono text-zinc-600">
          {[
            ...(task.task_assignees ?? []).map((a) =>
              displayNameFromProfile(a.profiles)
            ),
            ...(task.task_role_assignees ?? []).map(
              (r) => r.team_roles?.name ?? "Role"
            ),
          ].join(" · ")}
        </p>
      ) : null}
      {task.task_parts?.length ? (
        <p className="text-[10px] font-mono text-emerald-600/80">
          Parts: {task.task_parts.map((p) => p.parts?.name ?? "part").join(", ")}
        </p>
      ) : null}

      {canManage ? (
        <FieldInput
          as="select"
          value={task.status}
          onChange={(e) => onStatus(e.target.value as TaskStatus)}
        >
          {TASK_COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </FieldInput>
      ) : null}

      <div className="space-y-2 border-t border-zinc-900 pt-3">
        <Label>Subtasks</Label>
        {(task.subtasks ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400">{s.name}</span>
            {canManage ? (
              <select
                className="bg-black border border-zinc-800 rounded text-[10px] font-mono text-zinc-400 px-1 py-0.5"
                value={s.status}
                onChange={(e) =>
                  onSubtaskStatus(s.id, e.target.value as TaskStatus)
                }
              >
                {TASK_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[10px] font-mono text-zinc-600">{s.status}</span>
            )}
          </div>
        ))}
        {canManage ? (
          <div className="flex gap-2">
            <FieldInput
              placeholder="Add subtask"
              value={subtaskDraft}
              onChange={(e) => onDraftChange(e.target.value)}
            />
            <SecondaryButton type="button" onClick={onAddSubtask}>
              Add
            </SecondaryButton>
          </div>
        ) : null}
      </div>

      {canManage ? (
        <SecondaryButton type="button" onClick={onDelete} className="w-full">
          Delete
        </SecondaryButton>
      ) : null}
    </Panel>
  );
}
