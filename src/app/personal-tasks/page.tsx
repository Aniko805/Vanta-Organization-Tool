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
  createTask,
  deleteTask,
  listPersonalAndAssignedTasks,
  updateTask,
} from "@/lib/tasks";
import {
  TASK_COLUMNS,
  type Importance,
  type TaskStatus,
  type TaskWithRelations,
} from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export default function PersonalTasksPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<Importance>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>("todo");
  const [selectedParentId, setSelectedParentId] = useState("none");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const refresh = useCallback(async (uid: string) => {
    const data = await listPersonalAndAssignedTasks(uid);
    setTasks(data);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          setLoading(false);
          return;
        }
        setUserId(user.id);
        await refresh(user.id);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load tasks");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId || !taskName.trim()) return;

    setBusy(true);
    setError(null);
    try {
      await createTask({
        team_id: null,
        name: taskName.trim(),
        description: description.trim() || null,
        importance,
        due_date: dueDate || null,
        status: selectedStatus,
        is_personal: true,
        parent_id: selectedParentId === "none" ? null : selectedParentId,
      });
      setTaskName("");
      setDescription("");
      setImportance("medium");
      setDueDate("");
      setSelectedStatus("todo");
      setSelectedParentId("none");
      setShowForm(false);
      await refresh(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask || currentTask.status === status) return;

    setError(null);
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task))
    );
    try {
      await updateTask(taskId, { status });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, status: currentTask.status } : task
        )
      );
    }
  };

  const handleDrop = async (status: TaskStatus) => {
    if (!draggedTaskId) return;
    await handleStatusChange(draggedTaskId, status);
    setDraggedTaskId(null);
  };

  const handleDelete = async (task: TaskWithRelations) => {
    if (!window.confirm(`Are you sure you want to delete "${task.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await deleteTask(task.id);
      if (userId) await refresh(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <AppShell
      eyebrow="Personal"
      title="Personal Tasks"
      actions={
        <PrimaryButton
          type="button"
          onClick={() => setShowForm((visible) => !visible)}
        >
          {showForm ? "Close Form" : "New Task"}
        </PrimaryButton>
      }
    >
      <div className="space-y-6">
        <ErrorText>{error}</ErrorText>

        {showForm && (
          <Panel className="space-y-4">
            <Label>New personal task</Label>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <FieldInput
                  placeholder="Task name"
                  value={taskName}
                  onChange={(event) => setTaskName(event.target.value)}
                  required
                />
                <FieldInput
                  as="select"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as TaskStatus)
                  }
                  aria-label="Initial status"
                >
                  {TASK_COLUMNS.map((column) => (
                    <option key={column.id} value={column.id}>
                      Status: {column.label}
                    </option>
                  ))}
                </FieldInput>
                <FieldInput
                  as="select"
                  value={importance}
                  onChange={(event) =>
                    setImportance(event.target.value as Importance)
                  }
                  aria-label="Importance"
                >
                  <option value="low">Importance: Low</option>
                  <option value="medium">Importance: Medium</option>
                  <option value="high">Importance: High</option>
                  <option value="critical">Importance: Critical</option>
                </FieldInput>
                <FieldInput
                  as="select"
                  value={selectedParentId}
                  onChange={(event) => setSelectedParentId(event.target.value)}
                  aria-label="Parent task"
                >
                  <option value="none">No parent task</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.is_personal ? "Personal" : "Team"}: {task.name}
                    </option>
                  ))}
                </FieldInput>
              </div>
              <FieldInput
                as="textarea"
                placeholder="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <FieldInput
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  aria-label="Due date"
                  className="md:max-w-56"
                />
                <div className="flex gap-2">
                  <SecondaryButton
                    type="button"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </SecondaryButton>
                  <PrimaryButton
                    type="submit"
                    disabled={busy || !taskName.trim()}
                  >
                    {busy ? "Adding..." : "Add personal task"}
                  </PrimaryButton>
                </div>
              </div>
            </form>
          </Panel>
        )}

        {loading ? (
          <Panel>
            <EmptyState>Loading tasks...</EmptyState>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {TASK_COLUMNS.map((column) => {
              const columnTasks = tasks.filter(
                (task) => task.status === column.id
              );
              return (
                <section
                  key={column.id}
                  aria-label={`${column.label} tasks`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleDrop(column.id)}
                  className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 space-y-3 min-h-96 flex flex-col"
                >
                  <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-900">
                    <Label>{column.label}</Label>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                      {columnTasks.length}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3">
                    {columnTasks.length === 0 ? (
                      <div className="h-32 flex items-center justify-center border border-dashed border-zinc-900 rounded-lg">
                        <EmptyState>
                          {tasks.length === 0
                            ? "No tasks yet"
                            : "Drop a task here"}
                        </EmptyState>
                      </div>
                    ) : (
                      columnTasks.map((task) => {
                        const parentTask = tasks.find(
                          (candidate) => candidate.id === task.parent_id
                        );
                        const childCount = tasks.filter(
                          (candidate) => candidate.parent_id === task.id
                        ).length;
                        return (
                          <TaskCard
                            key={task.id}
                            task={task}
                            parentTask={parentTask}
                            childCount={childCount}
                            isDragging={draggedTaskId === task.id}
                            onDragStart={() => setDraggedTaskId(task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onStatusChange={(status) =>
                              void handleStatusChange(task.id, status)
                            }
                            onDelete={() => void handleDelete(task)}
                          />
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TaskCard({
  task,
  parentTask,
  childCount,
  isDragging,
  onDragStart,
  onDragEnd,
  onStatusChange,
  onDelete,
}: {
  task: TaskWithRelations;
  parentTask?: TaskWithRelations;
  childCount: number;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
}) {
  const isTeamTask = !task.is_personal;
  const sourceLabel = isTeamTask
    ? task.teams
      ? `${task.teams.name}${task.teams.team_number ? ` #${task.teams.team_number}` : ""}`
      : "Team task"
    : "Personal task";

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`space-y-3 p-4 rounded-lg cursor-grab active:cursor-grabbing transition-colors ${
        isTeamTask
          ? "bg-emerald-950/30 border border-emerald-900 hover:border-emerald-700"
          : "bg-black border border-zinc-800 hover:border-zinc-700"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 space-y-1">
          <span
            className={`text-[9px] font-mono uppercase ${
              isTeamTask ? "text-emerald-300" : "text-zinc-500"
            }`}
          >
            {isTeamTask ? "Team" : "Personal"} / {sourceLabel}
          </span>
          <h3 className="text-xs font-semibold text-zinc-100 leading-snug break-words">
            {task.name}
          </h3>
        </div>
        <span className="shrink-0 text-[10px] font-mono uppercase text-zinc-500">
          {task.importance}
        </span>
      </div>

      {task.description ? (
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
          {task.description}
        </p>
      ) : null}

      {task.parent_id ? (
        <p className="text-[10px] font-mono text-zinc-400 break-words">
          Child of: {parentTask?.name ?? "Linked task"}
        </p>
      ) : null}
      {childCount > 0 ? (
        <p className="text-[10px] font-mono text-zinc-500">
          {childCount} child {childCount === 1 ? "task" : "tasks"}
        </p>
      ) : null}
      {task.due_date ? (
        <p className="text-[10px] font-mono text-zinc-500">
          Due {task.due_date}
        </p>
      ) : null}

      <FieldInput
        as="select"
        value={task.status}
        onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
        aria-label={`Move ${task.name} to status`}
      >
        {TASK_COLUMNS.map((column) => (
          <option key={column.id} value={column.id}>
            {column.label}
          </option>
        ))}
      </FieldInput>

      {task.is_personal ? (
        <SecondaryButton type="button" onClick={onDelete}>
          Delete
        </SecondaryButton>
      ) : null}
    </article>
  );
}