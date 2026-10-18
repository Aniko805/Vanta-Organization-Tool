import { supabase } from "./supabase";
import type {
  Notebook,
  NotebookSection,
  NotebookTemplate,
  NotebookTemplateExport,
  NotebookTemplateSection,
  NotebookTemplateTab,
} from "./types";

export const NOTEBOOK_COOLDOWN_SECONDS = 120;
export const MAX_TEMPLATE_TABS = 8;
export const MAX_TEMPLATE_SECTIONS = 12;

const TEMPLATE_SELECT = `
  *,
  notebook_template_tabs(
    *,
    notebook_template_sections(*)
  )
`;

const NOTEBOOK_SELECT = `
  *,
  notebook_sections(
    *,
    notebook_section_refs(*)
  )
`;

function sortTemplate(template: NotebookTemplate): NotebookTemplate {
  const tabs = [...(template.notebook_template_tabs ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((tab) => ({
      ...tab,
      notebook_template_sections: [...(tab.notebook_template_sections ?? [])].sort(
        (a, b) => a.position - b.position
      ),
    }));
  return { ...template, notebook_template_tabs: tabs };
}

function sortNotebook(notebook: Notebook): Notebook {
  const sections = [...(notebook.notebook_sections ?? [])].sort(
    (a, b) =>
      a.tab_position - b.tab_position ||
      a.section_position - b.section_position ||
      a.section_name.localeCompare(b.section_name)
  );
  return { ...notebook, notebook_sections: sections };
}

export async function listTemplates(teamId: string): Promise<NotebookTemplate[]> {
  const { data, error } = await supabase
    .from("notebook_templates")
    .select(TEMPLATE_SELECT)
    .or(`team_id.eq.${teamId},team_id.is.null`);

  if (error) throw new Error(error.message);
  return ((data ?? []) as NotebookTemplate[]).map(sortTemplate);
}

export function activeTemplate(templates: NotebookTemplate[], teamId: string) {
  return (
    templates.find((template) => template.team_id === teamId && template.is_default) ?? null
  );
}

export function globalTemplate(templates: NotebookTemplate[]) {
  return templates.find((template) => template.team_id === null) ?? null;
}

export async function cloneTemplate(templateId: string, teamId: string): Promise<string> {
  const { data, error } = await supabase.rpc("clone_notebook_template", {
    p_template_id: templateId,
    p_team_id: teamId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setActiveTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.rpc("set_active_notebook_template", {
    p_template_id: templateId,
  });
  if (error) throw new Error(error.message);
}

export async function createTab(templateId: string, name: string, position: number) {
  const { data, error } = await supabase
    .from("notebook_template_tabs")
    .insert({ template_id: templateId, name: name.trim(), position })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as NotebookTemplateTab;
}

export async function updateTab(tabId: string, name: string) {
  const { error } = await supabase
    .from("notebook_template_tabs")
    .update({ name: name.trim() })
    .eq("id", tabId);
  if (error) throw new Error(error.message);
}

export async function deleteTab(tabId: string) {
  const { error } = await supabase.from("notebook_template_tabs").delete().eq("id", tabId);
  if (error) throw new Error(error.message);
}

export async function createSection(
  tabId: string,
  name: string,
  position: number,
  promptHint?: string
) {
  const { data, error } = await supabase
    .from("notebook_template_sections")
    .insert({
      tab_id: tabId,
      name: name.trim(),
      position,
      prompt_hint: promptHint?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as NotebookTemplateSection;
}

export async function updateSection(
  sectionId: string,
  patch: { name?: string; promptHint?: string | null }
) {
  const next: { name?: string; prompt_hint?: string | null } = {};
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.promptHint !== undefined) next.prompt_hint = patch.promptHint?.trim() || null;
  const { error } = await supabase
    .from("notebook_template_sections")
    .update(next)
    .eq("id", sectionId);
  if (error) throw new Error(error.message);
}

export async function deleteSection(sectionId: string) {
  const { error } = await supabase
    .from("notebook_template_sections")
    .delete()
    .eq("id", sectionId);
  if (error) throw new Error(error.message);
}

export async function reorderTabs(templateId: string, tabIds: string[]) {
  const { error } = await supabase.rpc("reorder_notebook_template_tabs", {
    p_template_id: templateId,
    p_tab_ids: tabIds,
  });
  if (error) throw new Error(error.message);
}

export async function reorderSections(tabId: string, sectionIds: string[]) {
  const { error } = await supabase.rpc("reorder_notebook_template_sections", {
    p_tab_id: tabId,
    p_section_ids: sectionIds,
  });
  if (error) throw new Error(error.message);
}

export function templateToExport(template: NotebookTemplate): NotebookTemplateExport {
  return {
    schemaVersion: 1,
    name: template.name,
    description: template.description ?? undefined,
    tabs: (template.notebook_template_tabs ?? []).map((tab) => ({
      name: tab.name,
      sections: (tab.notebook_template_sections ?? []).map((section) => ({
        name: section.name,
        promptHint: section.prompt_hint ?? undefined,
      })),
    })),
  };
}

export function validateTemplateImport(value: unknown): NotebookTemplateExport {
  if (!value || typeof value !== "object") {
    throw new Error("Template JSON must be an object with a name and tabs.");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== undefined && record.schemaVersion !== 1) {
    throw new Error("Unsupported template schema version.");
  }
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (name.length < 1 || name.length > 120) {
    throw new Error("Template name must be between 1 and 120 characters.");
  }
  if (!Array.isArray(record.tabs)) {
    throw new Error("Template JSON must include a tabs array.");
  }
  if (record.tabs.length > MAX_TEMPLATE_TABS) {
    throw new Error("A template can have at most 8 tabs.");
  }

  const tabs = record.tabs.map((tab) => {
    if (!tab || typeof tab !== "object") {
      throw new Error("Each tab must be an object with a name and sections.");
    }
    const tabRecord = tab as Record<string, unknown>;
    const tabName = typeof tabRecord.name === "string" ? tabRecord.name.trim() : "";
    if (tabName.length < 1 || tabName.length > 80) {
      throw new Error("Each tab name must be between 1 and 80 characters.");
    }
    if (!Array.isArray(tabRecord.sections)) {
      throw new Error("Each tab must include a sections array.");
    }
    if (tabRecord.sections.length > MAX_TEMPLATE_SECTIONS) {
      throw new Error("A tab can have at most 12 sections.");
    }
    const sections = tabRecord.sections.map((section) => {
      if (!section || typeof section !== "object") {
        throw new Error("Each section must be an object with a name.");
      }
      const sectionRecord = section as Record<string, unknown>;
      const sectionName =
        typeof sectionRecord.name === "string" ? sectionRecord.name.trim() : "";
      if (sectionName.length < 1 || sectionName.length > 80) {
        throw new Error("Each section name must be between 1 and 80 characters.");
      }
      const promptHint =
        typeof sectionRecord.promptHint === "string" ? sectionRecord.promptHint.trim() : "";
      if (promptHint.length > 1000) {
        throw new Error("A section prompt hint must be 1000 characters or fewer.");
      }
      return { name: sectionName, promptHint: promptHint || undefined };
    });
    return { name: tabName, sections };
  });

  const description =
    typeof record.description === "string" ? record.description.trim() : undefined;
  return { schemaVersion: 1, name, description, tabs };
}

export async function importTemplate(teamId: string, payload: NotebookTemplateExport) {
  const { data, error } = await supabase.rpc("import_notebook_template", {
    p_team_id: teamId,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setTeamAi(teamId: string, provider: string | null, model: string | null) {
  const { error } = await supabase.rpc("set_team_notebook_ai", {
    p_team_id: teamId,
    p_provider: provider,
    p_model: model,
  });
  if (error) throw new Error(error.message);
}

export async function getNotebook(teamId: string, date: string): Promise<Notebook | null> {
  const { data, error } = await supabase
    .from("notebooks")
    .select(NOTEBOOK_SELECT)
    .eq("team_id", teamId)
    .eq("notebook_date", date)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? sortNotebook(data as Notebook) : null;
}

export async function ensureNotebook(teamId: string, date: string): Promise<Notebook> {
  const existing = await getNotebook(teamId, date);
  if (existing) return existing;

  const templates = await listTemplates(teamId);
  const template = activeTemplate(templates, teamId);

  const { data, error } = await supabase
    .from("notebooks")
    .insert({
      team_id: teamId,
      notebook_date: date,
      template_id: template?.id ?? null,
      title: date,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    const raced = await getNotebook(teamId, date);
    if (raced) return raced;
    throw new Error(error.message);
  }

  if (template) {
    const { error: applyError } = await supabase.rpc("apply_template_to_notebook", {
      p_notebook_id: data.id,
    });
    if (applyError) throw new Error(applyError.message);
  }

  const created = await getNotebook(teamId, date);
  if (!created) throw new Error("Notebook could not be opened.");
  return created;
}

export async function listNotebookRows(teamId: string): Promise<
  Pick<Notebook, "id" | "notebook_date" | "status" | "title" | "source_note_count">[]
> {
  const { data, error } = await supabase
    .from("notebooks")
    .select("id, notebook_date, status, title, source_note_count")
    .eq("team_id", teamId)
    .order("notebook_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listNotebooksForDates(teamId: string, dates: string[]): Promise<Notebook[]> {
  if (dates.length === 0) return [];
  const { data, error } = await supabase
    .from("notebooks")
    .select(NOTEBOOK_SELECT)
    .eq("team_id", teamId)
    .in("notebook_date", dates);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Notebook[]).map(sortNotebook);
}

export async function updateSectionContent(input: {
  sectionId: string;
  content: string;
  editorId: string;
}): Promise<void> {
  const { error } = await supabase
    .from("notebook_sections")
    .update({
      content: input.content,
      is_user_edited: true,
      edited_by: input.editorId,
      edited_at: new Date().toISOString(),
    })
    .eq("id", input.sectionId);

  if (error) throw new Error(error.message);
}

export function notebookTabs(sections: NotebookSection[]) {
  const tabs = new Map<string, { name: string; position: number; sections: NotebookSection[] }>();
  for (const section of sections) {
    const current = tabs.get(section.tab_name) ?? {
      name: section.tab_name,
      position: section.tab_position,
      sections: [],
    };
    current.sections.push(section);
    tabs.set(section.tab_name, current);
  }
  return [...tabs.values()].sort((a, b) => a.position - b.position);
}

export function stalenessCount(
  notes: { updated_at: string }[],
  notebook: Pick<Notebook, "status" | "source_max_updated_at"> | null
) {
  if (!notebook || notebook.status !== "curated" || !notebook.source_max_updated_at) return 0;
  const stamp = new Date(notebook.source_max_updated_at).getTime();
  return notes.filter((note) => new Date(note.updated_at).getTime() > stamp).length;
}

export function sourcesUnchanged(
  notes: { updated_at: string }[],
  notebook: Pick<Notebook, "status" | "source_note_count" | "source_max_updated_at"> | null
) {
  if (!notebook || notebook.status !== "curated" || !notebook.source_max_updated_at) return false;
  if (notes.length !== notebook.source_note_count) return false;
  if (notes.length === 0) return true;
  const max = notes.reduce(
    (latest, note) => Math.max(latest, new Date(note.updated_at).getTime()),
    0
  );
  return max <= new Date(notebook.source_max_updated_at).getTime();
}
