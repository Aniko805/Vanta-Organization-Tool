"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function PersonalTasksPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<Importance>("medium");
  const [dueDate, setDueDate] = useState("");

  const refresh = useCallback(async (uid: string) => {
    const data = await listPersonalAndAssignedTasks(uid);
    setTasks(data);
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
        await refresh(user.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tasks");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refresh]);

  const personal = tasks.filter((t) => t.is_personal);
  const assigned = tasks.filter((t) => !t.is_personal);

  const handleCreate = async () => {
    if (!userId || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createTask({
        name,
        description,
        importance,
        due_date: dueDate || null,
        is_personal: true,
        created_by: userId,
      });
      setName("");
      setDescription("");
      setImportance("medium");
      setDueDate("");
      await refresh(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell eyebrow="Personal" title="Personal Tasks">
      <ErrorText>{error}</ErrorText>

      <Panel className="space-y-4">
        <Label>New personal task</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldInput
            placeholder="Task name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
        </div>
        <FieldInput
          as="textarea"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <FieldInput
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <PrimaryButton disabled={busy || !name.trim()} onClick={handleCreate}>
          Add personal task
        </PrimaryButton>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <Label>Assigned from teams</Label>
          {assigned.length === 0 ? (
            <Panel>
              <EmptyState>No team tasks assigned to you yet.</EmptyState>
            </Panel>
          ) : (
            assigned.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                canEditStatus
                onStatus={async (status) => {
                  try {
                    await updateTask(task.id, { status });
                    if (userId) await refresh(userId);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Update failed");
                  }
                }}
              />
            ))
          )}
        </section>

        <section className="space-y-3">
          <Label>Your personal tasks</Label>
          {personal.length === 0 ? (
            <Panel>
              <EmptyState>No personal tasks yet.</EmptyState>
            </Panel>
          ) : (
            personal.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                canEditStatus
                canDelete
                onStatus={async (status) => {
                  try {
                    await updateTask(task.id, { status });
                    if (userId) await refresh(userId);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Update failed");
                  }
                }}
                onDelete={async () => {
                  try {
                    await deleteTask(task.id);
                    if (userId) await refresh(userId);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Delete failed");
                  }
                }}
              />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}

function TaskRow({
  task,
  canEditStatus,
  canDelete,
  onStatus,
  onDelete,
}: {
  task: TaskWithRelations;
  canEditStatus?: boolean;
  canDelete?: boolean;
  onStatus?: (s: TaskStatus) => void;
  onDelete?: () => void;
}) {
  return (
    <Panel className="space-y-3 !p-4">
      <div className="flex justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{task.name}</h3>
          {task.teams ? (
            <p className="text-[10px] font-mono text-zinc-600 mt-1">
              {task.teams.name}
              {task.teams.team_number ? ` #${task.teams.team_number}` : ""}
            </p>
          ) : (
            <p className="text-[10px] font-mono text-zinc-600 mt-1">Personal</p>
          )}
        </div>
        <span className="text-[10px] font-mono uppercase text-zinc-500">
          {task.importance}
        </span>
      </div>
      {task.description ? (
        <p className="text-xs text-zinc-500">{task.description}</p>
      ) : null}
      {canEditStatus && onStatus ? (
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
      ) : (
        <p className="text-[10px] font-mono text-zinc-600">{task.status}</p>
      )}
      {canDelete && onDelete ? (
        <SecondaryButton type="button" onClick={onDelete}>
          Delete
        </SecondaryButton>
      ) : null}
    </Panel>
  );
}
