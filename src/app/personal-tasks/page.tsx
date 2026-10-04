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
import TaskCard from "@/app/components/TaskCard";
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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

export default function PersonalTasksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-zinc-500 font-mono text-xs flex items-center justify-center">
          Loading personal tasks…
        </div>
      }
    >
      <PersonalTasksContent />
    </Suspense>
  );
}

function PersonalTasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
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

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    if (params.get("new") !== "1") return;

    setShowForm(true);
    const parentId = params.get("parent");
    if (!parentId) {
      router.replace("/personal-tasks");
      return;
    }
    if (loading) return;

    const parentTask = tasks.find((task) => task.id === parentId);
    if (parentTask?.is_personal) {
      setSelectedParentId(parentTask.id);
    } else {
      setError("The selected personal parent task is unavailable.");
    }
    router.replace("/personal-tasks");
  }, [loading, queryString, router, tasks]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#task-")) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({
      block: "center",
    });
  }, [tasks]);

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
    if (
      !window.confirm(
        `Delete "${task.name}" and all of its child tasks? This cannot be undone.`
      )
    ) {
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
          <div id="task-form">
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
                    {tasks
                      .filter((task) => task.is_personal)
                      .map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.name}
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
          </div>
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
                        return (
                          <TaskCard
                            key={task.id}
                            task={task}
                            parentTask={parentTask}
                            childTasks={
                              task.child_tasks ??
                              tasks.filter(
                                (candidate) => candidate.parent_id === task.id
                              )
                            }
                            isDragging={draggedTaskId === task.id}
                            onDragStart={() => setDraggedTaskId(task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onStatusChange={(status) =>
                              void handleStatusChange(task.id, status)
                            }
                            onDelete={
                              task.is_personal
                                ? () => void handleDelete(task)
                                : undefined
                            }
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