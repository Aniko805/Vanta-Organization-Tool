import { supabase } from "./supabase";
import type {
  Importance,
  Subtask,
  Task,
  TaskStatus,
  TaskWithRelations,
} from "./types";

export type TaskInput = {
  name: string;
  description?: string;
  status?: TaskStatus;
  importance?: Importance;
  category?: string;
  competition_status?: string;
  due_date?: string | null;
  team_id?: string | null;
  is_personal?: boolean;
  created_by: string;
  assigneeIds?: string[];
  roleIds?: string[];
  partIds?: string[];
};

async function attachRelations(
  taskId: string,
  input: Pick<TaskInput, "assigneeIds" | "roleIds" | "partIds">
) {
  if (input.assigneeIds?.length) {
    const { error } = await supabase.from("task_assignees").insert(
      input.assigneeIds.map((user_id) => ({ task_id: taskId, user_id }))
    );
    if (error) throw new Error(error.message);
  }

  if (input.roleIds?.length) {
    const { error } = await supabase.from("task_role_assignees").insert(
      input.roleIds.map((role_id) => ({ task_id: taskId, role_id }))
    );
    if (error) throw new Error(error.message);
  }

  if (input.partIds?.length) {
    const { error } = await supabase.from("task_parts").insert(
      input.partIds.map((part_id) => ({ task_id: taskId, part_id }))
    );
    if (error) throw new Error(error.message);
  }
}

export async function createTask(input: TaskInput): Promise<Task> {
  const isPersonal = Boolean(input.is_personal);
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "todo",
      importance: input.importance ?? "medium",
      category: input.category?.trim() || null,
      competition_status: input.competition_status?.trim() || null,
      due_date: input.due_date || null,
      team_id: isPersonal ? null : input.team_id,
      is_personal: isPersonal,
      created_by: input.created_by,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await attachRelations(data.id, input);
  return data as Task;
}

export async function updateTask(
  taskId: string,
  updates: Partial<{
    name: string;
    description: string | null;
    status: TaskStatus;
    importance: Importance;
    category: string | null;
    competition_status: string | null;
    due_date: string | null;
  }>
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
}

export async function listTeamTasks(teamId: string): Promise<TaskWithRelations[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      *,
      task_assignees(user_id, profiles(*)),
      task_role_assignees(role_id, team_roles(*)),
      task_parts(part_id, parts(*)),
      subtasks(*)
    `
    )
    .eq("team_id", teamId)
    .eq("is_personal", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskWithRelations[];
}

export async function listPersonalAndAssignedTasks(
  userId: string
): Promise<TaskWithRelations[]> {
  const { data: assignedRows, error: assignedError } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", userId);

  if (assignedError) throw new Error(assignedError.message);

  const assignedIds = (assignedRows ?? []).map((r) => r.task_id);

  const { data: personal, error: personalError } = await supabase
    .from("tasks")
    .select(
      `
      *,
      task_assignees(user_id, profiles(*)),
      task_role_assignees(role_id, team_roles(*)),
      task_parts(part_id, parts(*)),
      subtasks(*),
      teams(id, name, team_number)
    `
    )
    .eq("is_personal", true)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (personalError) throw new Error(personalError.message);

  let assigned: TaskWithRelations[] = [];
  if (assignedIds.length > 0) {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        task_assignees(user_id, profiles(*)),
        task_role_assignees(role_id, team_roles(*)),
        task_parts(part_id, parts(*)),
        subtasks(*),
        teams(id, name, team_number)
      `
      )
      .in("id", assignedIds)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    assigned = (data ?? []) as TaskWithRelations[];
  }

  const byId = new Map<string, TaskWithRelations>();
  for (const task of [...(personal ?? []), ...assigned] as TaskWithRelations[]) {
    byId.set(task.id, task);
  }
  return [...byId.values()];
}

export async function createSubtask(input: {
  taskId: string;
  name: string;
  description?: string;
  due_date?: string | null;
  importance?: Importance;
  assigneeIds?: string[];
}): Promise<Subtask> {
  const { data, error } = await supabase
    .from("subtasks")
    .insert({
      task_id: input.taskId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      due_date: input.due_date || null,
      importance: input.importance ?? "medium",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  if (input.assigneeIds?.length) {
    const { error: assignError } = await supabase.from("subtask_assignees").insert(
      input.assigneeIds.map((user_id) => ({
        subtask_id: data.id,
        user_id,
      }))
    );
    if (assignError) throw new Error(assignError.message);
  }

  return data as Subtask;
}

export async function updateSubtaskStatus(
  subtaskId: string,
  status: TaskStatus
): Promise<void> {
  const { error } = await supabase
    .from("subtasks")
    .update({ status })
    .eq("id", subtaskId);
  if (error) throw new Error(error.message);
}

export async function setTaskAssignees(
  taskId: string,
  userIds: string[]
): Promise<void> {
  const { error: delError } = await supabase
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId);
  if (delError) throw new Error(delError.message);

  if (userIds.length === 0) return;

  const { error } = await supabase.from("task_assignees").insert(
    userIds.map((user_id) => ({ task_id: taskId, user_id }))
  );
  if (error) throw new Error(error.message);
}

export async function setTaskParts(taskId: string, partIds: string[]): Promise<void> {
  const { error: delError } = await supabase
    .from("task_parts")
    .delete()
    .eq("task_id", taskId);
  if (delError) throw new Error(delError.message);

  if (partIds.length === 0) return;

  const { error } = await supabase.from("task_parts").insert(
    partIds.map((part_id) => ({ task_id: taskId, part_id }))
  );
  if (error) throw new Error(error.message);
}
