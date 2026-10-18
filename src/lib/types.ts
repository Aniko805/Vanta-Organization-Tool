export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type Importance = "low" | "medium" | "high" | "critical";

export type Profile = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_image: string | null;
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
  ai_provider?: "deepseek" | "moonshot" | null;
  ai_model?: string | null;
};

export type TeamRole = {
  id: string;
  team_id: string;
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
  product_url: string | null;
  image_url: string | null;
  category: string | null;
  source: string | null;
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
  team_id: string | null;
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

export type TaskLink = Pick<
  Task,
  "id" | "name" | "team_id" | "is_personal" | "parent_id"
>;

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
  child_tasks?: TaskLink[];
  task_assignees?: { user_id: string; profiles?: Profile | null }[];
  task_role_assignees?: { role_id: string; team_roles?: TeamRole | null }[];
  task_parts?: { part_id: string; quantity?: number; parts?: Part | null }[];
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

export type EngNoteImage = {
  id: string;
  note_id: string | null;
  team_id: string;
  storage_path: string;
  mime_type: string | null;
  byte_size: number | null;
  caption: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  signed_url?: string | null;
};

export type EngNote = {
  id: string;
  team_id: string;
  note_date: string;
  author_id: string | null;
  title: string | null;
  body: string;
  subteam: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
  eng_note_images?: EngNoteImage[];
};

export type NotebookTemplateSection = {
  id: string;
  tab_id: string;
  name: string;
  position: number;
  prompt_hint: string | null;
};

export type NotebookTemplateTab = {
  id: string;
  template_id: string;
  name: string;
  position: number;
  notebook_template_sections?: NotebookTemplateSection[];
};

export type NotebookTemplate = {
  id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  notebook_template_tabs?: NotebookTemplateTab[];
};

export type NotebookStatus = "draft" | "curated" | "failed";

export type NotebookSectionRef = {
  id: string;
  section_id: string;
  kind: "note" | "task" | "image";
  note_id: string | null;
  task_id: string | null;
  image_id: string | null;
};

export type NotebookSection = {
  id: string;
  notebook_id: string;
  tab_name: string;
  tab_position: number;
  section_name: string;
  section_position: number;
  content: string;
  is_user_edited: boolean;
  edited_by: string | null;
  edited_at: string | null;
  notebook_section_refs?: NotebookSectionRef[];
};

export type Notebook = {
  id: string;
  team_id: string;
  notebook_date: string;
  template_id: string | null;
  title: string | null;
  status: NotebookStatus;
  generated_at: string | null;
  generated_by: string | null;
  provider: string | null;
  model: string | null;
  source_note_count: number;
  source_max_updated_at: string | null;
  created_at: string;
  updated_at: string;
  notebook_sections?: NotebookSection[];
};

export type NotebookTemplateExport = {
  schemaVersion: 1;
  name: string;
  description?: string;
  tabs: { name: string; sections: { name: string; promptHint?: string }[] }[];
};

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