"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell, {
  Panel,
  Label,
  FieldInput,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
} from "@/app/components/AppShell";
import TaskCard from "@/app/components/TaskCard";
import { createTask, deleteTask, updateTask, listTeamTasks } from "@/lib/tasks";
import { listAssignableParts } from "@/lib/parts";
import { getTeam, listTeamMembers, memberCanManageTasks } from "@/lib/teams";
import { supabase } from "@/lib/supabase";
import {
  displayNameFromProfile,
  type TaskStatus,
  type TaskWithRelations,
  type TeamMember,
  type Part,
} from "@/lib/types";

const KANBAN_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "TO DO" },
  { id: "in_progress", label: "IN PROGRESS" },
  { id: "blocked", label: "BLOCKED" },
  { id: "done", label: "DONE" },
];

export interface TeamInfo {
  id: string;
  name?: string;
  team_number?: string | number | null;
}

export interface TeamTasksClientProps {
  initialTasks?: TaskWithRelations[];
  teamId?: string | null;
  activeTeamInfo?: TeamInfo | null;
}

export default function TeamTasksClient({
  initialTasks = [],
  teamId,
  activeTeamInfo,
}: TeamTasksClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlTeamId = searchParams.get("team");
  const queryString = searchParams.toString();

  const [activeTeam, setActiveTeam] = useState<TeamInfo | null>(activeTeamInfo || null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(
    urlTeamId || teamId || activeTeamInfo?.id || null
  );

  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignableParts, setAssignableParts] = useState<Part[]>([]);
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [boardReady, setBoardReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Form input states
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("none");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>("todo");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);

  // Fetch team details and tasks when page mounts or team changes
  useEffect(() => {
    let isMounted = true;

    async function initTeamAndTasks() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let currentTeamId = urlTeamId || activeTeamInfo?.id || teamId || null;

      if (!currentTeamId && user) {
        const { data: member } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        currentTeamId = member?.team_id ?? null;
      }

      if (!currentTeamId || !isMounted) {
        setActiveTeamId(null);
        setActiveTeam(null);
        setTasks([]);
        setTeamMembers([]);
        setAssignableParts([]);
        setCanManageTasks(false);
        setLoadingOptions(false);
        setBoardReady(true);
        return;
      }

      setActiveTeamId(currentTeamId);
      setBoardReady(false);
      setLoadingOptions(true);
      setLoadError(null);
      setTasks([]);
      setTeamMembers([]);
      setAssignableParts([]);
      setCanManageTasks(false);

      try {
        const [teamData, fetchedTasks, members, parts] = await Promise.all([
          getTeam(currentTeamId),
          listTeamTasks(currentTeamId),
          listTeamMembers(currentTeamId),
          listAssignableParts(currentTeamId),
        ]);
        if (isMounted) {
          setActiveTeam(teamData);
          setTasks(fetchedTasks);
          setTeamMembers(members);
          setAssignableParts(parts);
          setCanManageTasks(
            Boolean(
              user &&
                teamData &&
                memberCanManageTasks(
                  teamData,
                  user.id,
                  members.find((member) => member.user_id === user.id)
                )
            )
          );
        }
      } catch (err) {
        if (isMounted) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load team data"
          );
        }
      } finally {
        if (isMounted) {
          setLoadingOptions(false);
          setBoardReady(true);
        }
      }
    }

    void initTeamAndTasks();

    return () => {
      isMounted = false;
    };
  }, [urlTeamId, teamId, activeTeamInfo]);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    if (params.get("new") !== "1" || !boardReady) return;

    setShowForm(true);
    const parentId = params.get("parent");
    const parentTask = parentId
      ? tasks.find(
          (task) =>
            task.id === parentId &&
            !task.is_personal &&
            task.team_id === activeTeamId
        )
      : undefined;

    if (parentTask) {
      setSelectedParentId(parentTask.id);
    } else if (parentId) {
      setErrorMessage("The selected team parent task is unavailable.");
    }

    const teamQuery = activeTeamId
      ? `?team=${encodeURIComponent(activeTeamId)}`
      : "";
    router.replace(`/team-tasks${teamQuery}`);
  }, [activeTeamId, boardReady, queryString, router, tasks]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#task-")) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({
      block: "center",
    });
  }, [tasks]);

  const parentTasks = useMemo(
    () => tasks.filter((t) => !t.is_personal),
    [tasks]
  );

  const toggleAssignee = (id: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePart = (id: string) => {
    setSelectedParts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    const resolvedTeamId = activeTeamId || urlTeamId || teamId || activeTeam?.id;

    if (!resolvedTeamId) {
      setErrorMessage(
        "No active team found for your user profile. Make sure you are added to a team in the team_members database."
      );
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const targetStatus = selectedStatus || "todo";
    const tempId = `temp-${Date.now()}`;

    // 1. Optimistic task entry
    const optimisticTask = {
      id: tempId,
      team_id: resolvedTeamId,
      name: taskName.trim(),
      description: description.trim() || null,
      status: targetStatus,
      importance: "medium",
      parent_id: selectedParentId === "none" ? null : selectedParentId,
      task_assignees: selectedAssignees.map((id) => {
        const member = teamMembers.find((m) => m.user_id === id);
        return { user_id: id, profiles: member?.profiles ?? null };
      }),
      task_parts: selectedParts.map((id) => {
        const part = assignableParts.find((p) => p.id === id);
        return { part_id: id, parts: part ?? null };
      }),
      subtasks: [],
    } as unknown as TaskWithRelations;

    // 2. Add to UI state immediately
    setTasks((prev) => [optimisticTask, ...prev]);

    try {
      // 3. Persist to Supabase
      const createdTask = await createTask({
        team_id: resolvedTeamId,
        name: optimisticTask.name,
        description: optimisticTask.description,
        status: targetStatus,
        importance: "medium",
        parent_id: optimisticTask.parent_id,
        assignee_ids: selectedAssignees,
        part_ids: selectedParts,
      });

      // 4. Update state with real Supabase task record
      if (createdTask && createdTask.id) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === tempId
              ? { ...optimisticTask, ...createdTask }
              : task
          )
        );
      }

      // Clear form inputs on success
      setTaskName("");
      setDescription("");
      setSelectedParentId("none");
      setSelectedStatus("todo");
      setSelectedAssignees([]);
      setSelectedParts([]);
      setShowForm(false);
    } catch (err: unknown) {
      const errorStr =
        err instanceof Error ? err.message : "Failed to create task in database";
      console.error("Supabase creation error:", err);
      setErrorMessage(errorStr);
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStatus: TaskStatus) => {
    if (!draggedTaskId) return;

    const currentTask = tasks.find((t) => t.id === draggedTaskId);
    if (!currentTask || currentTask.status === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTaskId ? { ...t, status: targetStatus } : t
      )
    );

    try {
      if (!draggedTaskId.startsWith("temp-")) {
        await updateTask(draggedTaskId, { status: targetStatus });
      }
    } catch (err) {
      console.error("Failed to update status in Supabase:", err);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggedTaskId ? { ...t, status: currentTask.status } : t
        )
      );
    } finally {
      setDraggedTaskId(null);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask || currentTask.status === status) return;

    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task))
    );
    try {
      if (!taskId.startsWith("temp-")) {
        await updateTask(taskId, { status });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Update failed");
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, status: currentTask.status } : task
        )
      );
    }
  };

  const handleDelete = async (task: TaskWithRelations) => {
    if (
      !window.confirm(
        `Delete "${task.name}" and all of its child tasks? This cannot be undone.`
      )
    ) {
      return;
    }
    if (!activeTeamId) return;

    setErrorMessage(null);
    try {
      await deleteTask(task.id);
      setTasks(await listTeamTasks(activeTeamId));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <AppShell
      eyebrow="Operations"
      title="Team Tasks"
      actions={
        <PrimaryButton onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close Form" : "New Task"}
        </PrimaryButton>
      }
    >
      <div className="space-y-6">
        {/* Active Team Info Header Badge */}
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-lg px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono">ACTIVE TEAM:</span>
            {activeTeam ? (
              <span className="font-semibold text-white font-mono">
                {activeTeam.team_number ? `#${activeTeam.team_number}` : ""} {activeTeam.name || "Unnamed Team"}
              </span>
            ) : activeTeamId ? (
              <span className="font-mono text-zinc-400">{activeTeamId}</span>
            ) : (
              <span className="text-amber-500 font-mono">No team assigned</span>
            )}
          </div>
        </div>

        {loadError && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-xs text-red-200">
            <strong>Loading Error:</strong> {loadError}
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-xs text-red-200">
            <strong>Supabase Error:</strong> {errorMessage}
          </div>
        )}

        {/* Creation Form Panel */}
        {showForm && (
          <div id="task-form">
            <Panel className="space-y-4">
              <Label>Create Task</Label>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FieldInput
                    type="text"
                    placeholder="Task name (e.g. Assemble Subsystem)"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                  />

                  <FieldInput
                    as="select"
                    value={selectedStatus}
                    onChange={(e) =>
                      setSelectedStatus(e.target.value as TaskStatus)
                    }
                  >
                    {KANBAN_COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        Column: {col.label}
                      </option>
                    ))}
                  </FieldInput>

                  <FieldInput
                    as="select"
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                  >
                    <option value="none">-- Major Task (No Parent) --</option>
                    {parentTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        Parent: {t.name}
                      </option>
                    ))}
                  </FieldInput>
                </div>

                <FieldInput
                  as="textarea"
                  placeholder="Description / Requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label>Assign Team Members</Label>
                    <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-2">
                      {loadingOptions ? (
                        <EmptyState>Loading team members...</EmptyState>
                      ) : teamMembers.length === 0 ? (
                        <EmptyState>
                          {loadError ? "Team members unavailable" : "No team members available"}
                        </EmptyState>
                      ) : (
                        teamMembers.map((m) => (
                          <label
                            key={m.user_id}
                            className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-white"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssignees.includes(m.user_id)}
                              onChange={() => toggleAssignee(m.user_id)}
                              className="accent-white"
                            />
                            {displayNameFromProfile(m.profiles)}
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Attach Parts</Label>
                    <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-2">
                      {loadingOptions ? (
                        <EmptyState>Loading team parts...</EmptyState>
                      ) : assignableParts.length === 0 ? (
                        <EmptyState>
                          {loadError ? "Team parts unavailable" : "No assignable parts"}
                        </EmptyState>
                      ) : (
                        assignableParts.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-white"
                          >
                            <input
                              type="checkbox"
                              checked={selectedParts.includes(p.id)}
                              onChange={() => togglePart(p.id)}
                              className="accent-white"
                            />
                            {p.part_catalog?.name ?? "Unnamed Part"}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <SecondaryButton
                    type="button"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </SecondaryButton>
                  <PrimaryButton
                    type="submit"
                    disabled={loading || !taskName.trim()}
                  >
                    {loading ? "Adding..." : "Add Task"}
                  </PrimaryButton>
                </div>
              </form>
            </Panel>
          </div>
        )}

        {/* Kanban Board Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.id)}
                className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 space-y-3 min-h-125 flex flex-col"
              >
                <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-900">
                  <Label>{col.label}</Label>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  {columnTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border border-dashed border-zinc-900 rounded-lg">
                      <EmptyState>Drop here</EmptyState>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        parentTask={tasks.find((candidate) => candidate.id === task.parent_id)}
                        childTasks={tasks.filter((candidate) => candidate.parent_id === task.id)}
                        isDragging={draggedTaskId === task.id}
                        onDragStart={() => handleDragStart(task.id)}
                        onDragEnd={() => setDraggedTaskId(null)}
                        onStatusChange={(status) =>
                          void handleStatusChange(task.id, status)
                        }
                        onDelete={
                          canManageTasks
                            ? () => void handleDelete(task)
                            : undefined
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}