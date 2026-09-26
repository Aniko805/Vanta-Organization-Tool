"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import AppShell, {
  Panel,
  Label,
  FieldInput,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
} from "@/app/components/AppShell";
import { createTask, updateTask, listTeamTasks } from "@/lib/tasks";
import {
  displayNameFromProfile,
  type TaskStatus,
  type TaskWithRelations,
  type Profile,
  type Part,
} from "@/lib/types";

const KANBAN_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "TO DO" },
  { id: "in_progress", label: "IN PROGRESS" },
  { id: "blocked", label: "BLOCKED" },
  { id: "done", label: "DONE" },
];

export interface TeamTasksClientProps {
  initialTasks?: TaskWithRelations[];
  teamMembers?: Profile[];
  assignableParts?: Part[];
  teamId?: string | null;
}

export default function TeamTasksClient({
  initialTasks = [],
  teamMembers = [],
  assignableParts = [],
  teamId,
}: TeamTasksClientProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Form input states
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("none");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>("todo");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);

  const createFormRef = useRef<HTMLDivElement | null>(null);

  // Re-fetch existing tasks on page/component load
  useEffect(() => {
    let isMounted = true;
    if (teamId) {
      listTeamTasks(teamId)
        .then((fetchedTasks) => {
          if (isMounted && fetchedTasks) {
            setTasks(fetchedTasks);
          }
        })
        .catch((err) => {
          console.error("Error loading team tasks:", err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [teamId]);

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

    setLoading(true);
    setErrorMessage(null);

    const targetStatus = selectedStatus || "todo";
    const tempId = `temp-${Date.now()}`;

    // 1. Optimistic task entry
    const optimisticTask = {
      id: tempId,
      team_id: teamId ?? null,
      name: taskName.trim(),
      description: description.trim() || null,
      status: targetStatus,
      importance: "medium",
      parent_id: selectedParentId === "none" ? null : selectedParentId,
      task_assignees: selectedAssignees.map((id) => {
        const profile = teamMembers.find((m) => m.id === id);
        return { user_id: id, profiles: profile ?? null };
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
        team_id: teamId ?? null,
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
          prev.map((t) => (t.id === tempId ? createdTask : t))
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

      // Keep task visible in UI with alert indicator rather than removing it instantly
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
        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-xs text-red-200">
            <strong>Supabase Error:</strong> {errorMessage}
          </div>
        )}

        {/* Creation Form Panel */}
        {showForm && (
          <div ref={createFormRef}>
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
                      {teamMembers.length === 0 ? (
                        <EmptyState>No members available</EmptyState>
                      ) : (
                        teamMembers.map((m) => (
                          <label
                            key={m.id}
                            className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-white"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssignees.includes(m.id)}
                              onChange={() => toggleAssignee(m.id)}
                              className="accent-white"
                            />
                            {displayNameFromProfile(m)}
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Attach Parts</Label>
                    <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-2">
                      {assignableParts.length === 0 ? (
                        <EmptyState>No assignable parts</EmptyState>
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
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        className="group bg-black border border-zinc-800 hover:border-zinc-700 p-4 rounded-lg space-y-3 cursor-grab active:cursor-grabbing transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-xs font-semibold text-zinc-100 leading-snug">
                            {task.name}
                          </h3>
                          {task.id.startsWith("temp-") && (
                            <span className="text-[9px] font-mono text-amber-400 bg-amber-950/50 px-1.5 py-0.5 border border-amber-800 rounded">
                              Saving...
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Assignees */}
                        {task.task_assignees && task.task_assignees.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {task.task_assignees.map((a, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                              >
                                {displayNameFromProfile(a.profiles)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Attached Parts */}
                        {task.task_parts && task.task_parts.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {task.task_parts.map((p, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono text-emerald-400/80 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                              >
                                {p.parts?.part_catalog?.name ?? "Part"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
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