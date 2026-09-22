export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type Importance = "low" | "medium" | "high" | "critical";

export type Profile = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Team = {
  id: string;
  name: string;
  team_number: string | null;
  owner_id: string | null;
  invite_code: string;
  created_at: string | null;
  updated_at: string;
};

export type TeamRole = {
  id: string;
  team_id: string | null;
  name: string | null;
  is_admin: boolean;
  can_manage_members: boolean;
  can_manage_tasks: boolean;
  can_manage_inventory: boolean;
  created_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role_id?: string | null;
  role_ids?: string[];
  joined_at?: string;
  profiles?: Profile | null;
  team_roles?: TeamRole | null;
  team_roles_list?: TeamRole[];
};

export type PartCatalog = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  manufacturer: string | null;
  team_id: string | null;
  is_official: boolean;
  created_by: string | null;
  created_at: string;
};

export type StatusList = {
  id: string;
  name: string;
  description: string | null;
  team_id: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
};

export type PartStatus = {
  id: string;
  name: string;
  description: string | null;
  status_id: string | null;
  part_id: string | null;
  quantity: number;
  created_by: string | null;
  created_at: string;
  status_list?: StatusList | null;
};

export type Part = {
  id: string;
  team_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  part_catalog_id: string | null;
  part_catalog?: PartCatalog | null;
  part_status?: PartStatus[];
};

export type Task = {
  id: string;
  team_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  status: "todo" | "in_progress" | "done" | "blocked";
  importance: "low" | "medium" | "high" | "critical";
  category?: string | null;
  due_date?: string | null;
  is_personal: boolean;
  parent_id?: string | null; // <-- Added parent_id link
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

export const PART_STATUSES = [
  { value: "PLANNING", label: "Planning" },
  { value: "DESIGNING", label: "Designing" },
  { value: "ORDERED", label: "Ordered" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "ASSEMBLING", label: "Assembling" },
  { value: "TESTING", label: "Testing" },
  { value: "COMPLETE", label: "Complete" },
];

export function displayNameFromProfile(
  profile?: Profile | null,
  fallback = "Member"
) {
  if (!profile) return fallback;
  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (profile.username?.trim()) return profile.username.trim();
  return fallback;
}