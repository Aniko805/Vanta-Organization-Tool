export type PartStatus = "inventory" | "to_be_used" | "used" | "removed";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type Importance = "low" | "medium" | "high" | "critical";

export type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export type Team = {
  id: string;
  name: string;
  team_number: string | null;
  owner_id: string;
  invite_code: string;
  created_at: string;
};

export type TeamRole = {
  id: string;
  team_id: string;
  name: string;
  is_admin: boolean;
  can_manage_members: boolean;
  can_manage_tasks: boolean;
  can_manage_inventory: boolean;
};

export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role_id: string | null;
  joined_at: string;
  profiles?: Profile | null;
  team_roles?: TeamRole | null;
};

export type Part = {
  id: string;
  team_id: string;
  name: string;
  sku: string | null;
  status: PartStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  team_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  importance: Importance;
  category: string | null;
  competition_status: string | null;
  due_date: string | null;
  is_personal: boolean;
  created_at: string;
  updated_at: string;
};

export type Subtask = {
  id: string;
  task_id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  importance: Importance;
  due_date: string | null;
  created_at: string;
};

export type TaskWithRelations = Task & {
  task_assignees?: { user_id: string; profiles?: Profile | null }[];
  task_role_assignees?: { role_id: string; team_roles?: TeamRole | null }[];
  task_parts?: { part_id: string; parts?: Part | null }[];
  subtasks?: Subtask[];
  teams?: Pick<Team, "id" | "name" | "team_number"> | null;
};

export const TASK_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
];

export const PART_STATUSES: { id: PartStatus; label: string }[] = [
  { id: "inventory", label: "Inventory" },
  { id: "to_be_used", label: "To Be Used" },
  { id: "used", label: "Used" },
  { id: "removed", label: "Removed" },
];

export function displayNameFromProfile(profile?: Profile | null, fallback = "Member") {
  if (!profile) return fallback;
  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (profile.username?.trim()) return profile.username.trim();
  return fallback;
}
