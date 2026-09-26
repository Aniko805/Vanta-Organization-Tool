"use client";

import { useState, useRef, useMemo } from "react";
import AppShell, {
  Panel,
  Label,
  FieldInput,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
} from "@/app/components/AppShell";
import { createTask, updateTask } from "@/lib/tasks";
import {
  TASK_COLUMNS,
  displayNameFromProfile,
  type TaskStatus,
  type TaskWithRelations,
  type Profile,
  type Part,
} from "@/lib/types";

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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Form states
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("none");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>("todo");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);

  const createFormRef = useRef<HTMLDivElement | null>(null);

  // Filter top-level tasks for the Parent Task selector dropdown
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
    if (!taskName.trim() || !teamId) return;

    setLoading(true);
    try {
      const newTask = await createTask({
        team_id: teamId,
        name: taskName.trim(),
        description: description.trim() || null,
        status: selectedStatus || "todo",
        importance: "medium",
        assignee_ids: selectedAssignees,
        part_ids: selectedParts,
      });

      setTasks((prev) => [newTask, ...prev]);
      setTaskName("");
      setDescription("");
      setSelectedParentId("none");
      setSelectedStatus("todo");
      setSelectedAssignees([]);
      setSelectedParts([]);
      setShowForm(false);
    } catch (err: unknown) {
      console.error("Failed to create task:", err);
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop Handlers
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

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTaskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await updateTask(draggedTaskId, { status: targetStatus });
    } catch (err) {
      console.error("Failed to update task status:", err);
      // Rollback on error
      setTasks((prev) =>
        prev.map((t) => (t.id === draggedTaskId ? { ...t, status: currentTask.status } : t))
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
        {/* Create Task Panel Wrapper */}
        {showForm && (
          <div ref={createFormRef}>
            <Panel className="space-y-4">
              <Label>Create Task</Label>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FieldInput
                    type="text"
                    placeholder="Task name (e.g. Assemble Elevator Subsystem)"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                  />

                  {/* Column Status Dropdown */}
                  <FieldInput
                    as="select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as TaskStatus)}
                  >
                    {TASK_COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        Column: {col.label}
                      </option>
                    ))}
                  </FieldInput>

                  {/* Parent Dropdown */}
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
                      {teamMembers.map((m) => (
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
                      ))}
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
                  <SecondaryButton type="button" onClick={() => setShowForm(false)}>
                    Cancel
                  </SecondaryButton>
                  <PrimaryButton type="submit" disabled={loading || !taskName.trim()}>
                    {loading ? "Adding..." : "Add Task"}
                  </PrimaryButton>
                </div>
              </form>
            </Panel>
          </div>
        )}

        {/* Kanban Board Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {TASK_COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.id)}
                className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 space-y-3 min-h-[500px] flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-900">
                  <Label>{col.label}</Label>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task Cards Container */}
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
                          {task.importance && (
                            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 px-1.5 py-0.5 border border-zinc-800 rounded">
                              {task.importance}
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

                        {/* Subtasks Summary */}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="border-t border-zinc-900/80 pt-2 space-y-1">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                              Subtasks ({task.subtasks.filter((s) => s.status === "done").length}/
                              {task.subtasks.length})
                            </span>
                            <div className="space-y-1">
                              {task.subtasks.map((st) => (
                                <div
                                  key={st.id}
                                  className="flex items-center justify-between text-[11px] text-zinc-400"
                                >
                                  <span className={st.status === "done" ? "line-through text-zinc-600" : ""}>
                                    └ {st.name}
                                  </span>
                                  <span className="text-[9px] font-mono text-zinc-600">
                                    {st.status}
                                  </span>
                                </div>
                              ))}
                            </div>
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