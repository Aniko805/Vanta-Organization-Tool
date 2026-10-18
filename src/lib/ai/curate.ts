import type { SupabaseClient } from "@supabase/supabase-js";
import { collectRefs, rewriteHandles, type HandleMaps } from "./handles";
import type { CurateEvent } from "./events";
import { completeJson, isAiProvider, providerConfig } from "./provider";

const NOTE_CAP = 40;
const BODY_CAP = 4000;
const TASK_CAP = 40;
const STALE_RUN_MS = 90_000;

const SYSTEM_PROMPT = `You curate a robotics team's engineering notebook. You are given one day's raw notes, photos, and tasks for a single subteam. Fill the requested sections.
Rules: use only the supplied handles; cite every factual claim with [[note:nX]]; place photos with [[image:iX]] where they belong in the section, not in a dump at the end; reference tasks with [[task:tX]]; never invent handles; be concrete and past-tense; no preamble, no closing remarks.
Respond with a JSON object of the form {"sections":[{"name":"...","content":"..."}]} where content is markdown.`;

type Send = (event: CurateEvent) => void;

type NoteRow = {
  id: string;
  title: string | null;
  body: string;
  subteam: string | null;
  created_at: string;
  updated_at: string;
  author?: { first_name?: string | null; last_name?: string | null; username?: string | null } | null;
  eng_note_images?: { id: string; caption: string | null; position: number }[];
};

type SectionRow = {
  id: string;
  tab_name: string;
  tab_position: number;
  section_name: string;
  section_position: number;
  is_user_edited: boolean;
};

type TaskRow = {
  id: string;
  name: string;
  status: string;
  importance: string;
  updated_at: string;
  task_assignees?: { profiles?: { first_name?: string | null; last_name?: string | null; username?: string | null } | null }[];
  task_role_assignees?: { team_roles?: { name?: string | null } | null }[];
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function personName(profile?: { first_name?: string | null; last_name?: string | null; username?: string | null } | null) {
  const first = profile?.first_name?.trim();
  const last = profile?.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (profile?.username?.trim()) return profile.username.trim();
  return "Member";
}

function parseModelSections(raw: string): { name: string; content: string }[] {
  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(trimmed) as { sections?: { name?: unknown; content?: unknown }[] };
  if (!parsed || !Array.isArray(parsed.sections)) {
    throw new Error("The model returned an unexpected shape.");
  }
  return parsed.sections
    .filter((section) => section && typeof section.name === "string")
    .map((section) => ({
      name: String(section.name).trim(),
      content: typeof section.content === "string" ? section.content : "",
    }));
}

function notesForTab(notes: NoteRow[], tabName: string) {
  const wanted = tabName.toLowerCase();
  const chosen = notes.filter((note) => {
    const tag = note.subteam?.trim();
    return !tag || tag.toLowerCase() === wanted;
  });
  chosen.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return chosen;
}

export async function curateNotebook(input: {
  supabase: SupabaseClient;
  userId: string;
  notebookId: string;
  confirmOverwrite: boolean;
  send: Send;
}) {
  const { supabase, send } = input;
  const { data: notebook, error: notebookError } = await supabase
    .from("notebooks")
    .select("*, notebook_sections(*)")
    .eq("id", input.notebookId)
    .maybeSingle();

  if (notebookError) throw new Error(notebookError.message);
  if (!notebook) throw new Error("Notebook not found.");

  const sections = ((notebook.notebook_sections ?? []) as SectionRow[]).sort(
    (a, b) => a.tab_position - b.tab_position || a.section_position - b.section_position
  );
  if (sections.length === 0) {
    throw new Error("This notebook has no sections. An admin needs to apply a template first.");
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("ai_provider, ai_model")
    .eq("id", notebook.team_id)
    .single();
  if (teamError) throw new Error(teamError.message);
  if (!isAiProvider(team?.ai_provider)) {
    throw new Error("Choose an AI provider in notebook settings before updating.");
  }
  const provider = team.ai_provider;
  const configured = providerConfig(provider);
  if (!process.env[configured.env]?.trim()) {
    throw new Error(`The ${configured.label} key is not configured on the server.`);
  }

  const { data: noteRows, error: notesError } = await supabase
    .from("eng_notes")
    .select(
      "id, title, body, subteam, created_at, updated_at, author:profiles!eng_notes_author_id_fkey(first_name, last_name, username), eng_note_images(id, caption, position)"
    )
    .eq("team_id", notebook.team_id)
    .eq("note_date", notebook.notebook_date);
  if (notesError) throw new Error(notesError.message);
  const notes = (noteRows ?? []) as NoteRow[];

  if (notes.length === 0) {
    send({ type: "noop", message: "Nothing to curate." });
    return;
  }

  const maxUpdated = notes.reduce(
    (latest, note) => (note.updated_at > latest ? note.updated_at : latest),
    notes[0].updated_at
  );
  const unchanged =
    notebook.status === "curated" &&
    notebook.source_note_count === notes.length &&
    notebook.source_max_updated_at &&
    new Date(maxUpdated).getTime() <= new Date(notebook.source_max_updated_at).getTime();
  if (unchanged) {
    send({ type: "noop", message: "Nothing to curate." });
    return;
  }

  const edited = sections.filter((section) => section.is_user_edited);
  if (edited.length > 0 && !input.confirmOverwrite) {
    send({
      type: "confirm",
      sections: edited.map((section) => ({
        id: section.id,
        tabName: section.tab_name,
        sectionName: section.section_name,
      })),
    });
    return;
  }

  const { data: elapsed, error: elapsedError } = await supabase.rpc(
    "notebook_seconds_since_success",
    { p_notebook_id: notebook.id }
  );
  if (elapsedError) throw new Error(elapsedError.message);
  const { data: cooldown, error: cooldownError } = await supabase.rpc(
    "notebook_curation_cooldown_seconds"
  );
  if (cooldownError) throw new Error(cooldownError.message);
  const windowSeconds = typeof cooldown === "number" ? cooldown : 120;
  if (typeof elapsed === "number" && elapsed < windowSeconds) {
    send({ type: "cooldown", remainingSeconds: windowSeconds - elapsed });
    return;
  }

  const staleBefore = new Date(Date.now() - STALE_RUN_MS).toISOString();
  await supabase
    .from("notebook_runs")
    .update({
      status: "failed",
      error: "The curation run timed out.",
      finished_at: new Date().toISOString(),
    })
    .eq("notebook_id", notebook.id)
    .eq("status", "running")
    .lt("started_at", staleBefore);

  const { data: activeRun } = await supabase
    .from("notebook_runs")
    .select("id")
    .eq("notebook_id", notebook.id)
    .eq("status", "running")
    .limit(1)
    .maybeSingle();
  if (activeRun) throw new Error("A curation run is already in progress.");

  const { data: run, error: runError } = await supabase
    .from("notebook_runs")
    .insert({
      notebook_id: notebook.id,
      team_id: notebook.team_id,
      provider,
      model: team.ai_model,
      status: "running",
      requested_by: input.userId,
      note_count: notes.length,
    })
    .select("id")
    .single();
  if (runError) throw new Error(runError.message);

  const fail = async (message: string) => {
    const text = message.slice(0, 500);
    try {
      await supabase
        .from("notebook_runs")
        .update({ status: "failed", error: text, finished_at: new Date().toISOString() })
        .eq("id", run.id);
      if (notebook.status !== "curated") {
        await supabase.from("notebooks").update({ status: "failed" }).eq("id", notebook.id);
      }
    } catch {
      // The streamed error is the user-facing result.
    }
    send({ type: "error", message: text });
  };

  try {
    send({ type: "status", message: "Reading today's notes." });

    const { data: taskRows, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, name, status, importance, updated_at, task_assignees(profiles(first_name, last_name, username)), task_role_assignees(team_roles(name))"
      )
      .eq("team_id", notebook.team_id)
      .eq("is_personal", false)
      .in("status", ["todo", "in_progress", "blocked"])
      .limit(200);
    if (taskError) throw new Error(taskError.message);

    const importanceRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const tasks = ((taskRows ?? []) as TaskRow[])
      .sort((a, b) => {
        const rank = (importanceRank[a.importance] ?? 9) - (importanceRank[b.importance] ?? 9);
        if (rank !== 0) return rank;
        return b.updated_at.localeCompare(a.updated_at);
      })
      .slice(0, TASK_CAP);

    const taskHandles = new Map<string, string>();
    tasks.forEach((task, index) => taskHandles.set(`t${index + 1}`, task.id));

    const hints = new Map<string, string>();
    if (notebook.template_id) {
      const { data: template } = await supabase
        .from("notebook_templates")
        .select("notebook_template_tabs(name, notebook_template_sections(name, prompt_hint))")
        .eq("id", notebook.template_id)
        .maybeSingle();
      const tabs = (template?.notebook_template_tabs ?? []) as {
        name: string;
        notebook_template_sections?: { name: string; prompt_hint: string | null }[];
      }[];
      for (const tab of tabs) {
        for (const section of tab.notebook_template_sections ?? []) {
          if (section.prompt_hint) hints.set(`${tab.name}|${section.name}`, section.prompt_hint);
        }
      }
    }

    const tabNames = [...new Set(sections.map((section) => section.tab_name))].sort(
      (a, b) =>
        (sections.find((section) => section.tab_name === a)?.tab_position ?? 0) -
        (sections.find((section) => section.tab_name === b)?.tab_position ?? 0)
    );

    const warnings: { level: "info" | "warn"; message: string }[] = [];
    let promptTokens = 0;
    let completionTokens = 0;

    const curated = await Promise.all(
      tabNames.map(async (tabName) => {
        const tabSections = sections.filter((section) => section.tab_name === tabName);
        const tabNotes = notesForTab(notes, tabName);
        const droppedNotes = Math.max(0, tabNotes.length - NOTE_CAP);
        const usedNotes = tabNotes.slice(0, NOTE_CAP);
        if (droppedNotes > 0) {
          warnings.push({
            level: "warn",
            message: `${tabName}: left ${droppedNotes} older notes out of the prompt.`,
          });
        }

        const noteHandles = new Map<string, string>();
        const imageHandles = new Map<string, string>();
        let imageIndex = 1;
        const promptNotes = usedNotes.map((note, index) => {
          const handle = `n${index + 1}`;
          noteHandles.set(handle, note.id);
          const images = [...(note.eng_note_images ?? [])].sort((a, b) => a.position - b.position);
          const promptImages = images.map((image) => {
            const imageHandle = `i${imageIndex}`;
            imageIndex += 1;
            imageHandles.set(imageHandle, image.id);
            return { handle: imageHandle, caption: image.caption };
          });
          let body = note.body ?? "";
          if (body.length > BODY_CAP) {
            body = body.slice(0, BODY_CAP);
            warnings.push({
              level: "warn",
              message: `${tabName}: truncated a note body to ${BODY_CAP} characters.`,
            });
          }
          return {
            handle,
            time: new Date(note.created_at).toISOString(),
            author: personName(asOne(note.author)),
            title: note.title,
            body,
            images: promptImages,
          };
        });

        const promptTasks = tasks.map((task) => ({
          handle: [...taskHandles.entries()].find(([, id]) => id === task.id)?.[0],
          name: task.name,
          status: task.status,
          assignees: (task.task_assignees ?? []).map((assignee) => personName(asOne(assignee.profiles))),
          roles: (task.task_role_assignees ?? [])
            .map((assignee) => asOne(assignee.team_roles)?.name)
            .filter(Boolean),
        }));

        const userPayload = {
          date: notebook.notebook_date,
          tab: tabName,
          sections: tabSections.map((section) => ({
            name: section.section_name,
            promptHint:
              hints.get(`${tabName}|${section.section_name}`) ??
              "Concrete bullets, past tense.",
          })),
          notes: promptNotes,
          tasks: promptTasks,
        };

        const completion = await completeJson({
          provider,
          model: team.ai_model,
          system: SYSTEM_PROMPT,
          user: JSON.stringify(userPayload),
        });
        promptTokens += completion.promptTokens;
        completionTokens += completion.completionTokens;
        const modelSections = parseModelSections(completion.content);
        const maps: HandleMaps = { note: noteHandles, image: imageHandles, task: taskHandles };

        const written = tabSections.map((section) => {
          const match = modelSections.find(
            (item) => item.name.toLowerCase() === section.section_name.toLowerCase()
          );
          if (!match) {
            warnings.push({
              level: "warn",
              message: `${tabName}: the model omitted ${section.section_name}.`,
            });
          }
          let content = match?.content ?? "";
          content = rewriteHandles(content, maps, (token) => {
            warnings.push({
              level: "warn",
              message: `${tabName}: dropped unresolved citation ${token}.`,
            });
          });
          const refs = collectRefs(content).map((ref) => ({
            kind: ref.kind,
            note_id: ref.kind === "note" ? ref.id : null,
            task_id: ref.kind === "task" ? ref.id : null,
            image_id: ref.kind === "image" ? ref.id : null,
          }));
          return { id: section.id, content, refs };
        });

        for (const extra of modelSections) {
          const known = tabSections.some(
            (section) => section.section_name.toLowerCase() === extra.name.toLowerCase()
          );
          if (!known) {
            warnings.push({
              level: "warn",
              message: `${tabName}: ignored unexpected section ${extra.name}.`,
            });
          }
        }

        send({ type: "tab-done", tab: tabName });
        return written;
      })
    );

    if (warnings.length > 0) {
      await supabase.from("notebook_run_events").insert(
        warnings.map((warning) => ({
          run_id: run.id,
          level: warning.level,
          message: warning.message,
        }))
      );
    }

    const { error: commitError } = await supabase.rpc("commit_notebook_curation", {
      p_run_id: run.id,
      p_sections: curated.flat(),
      p_prompt_tokens: promptTokens,
      p_completion_tokens: completionTokens,
      p_note_count: notes.length,
      p_source_max_updated_at: maxUpdated,
      p_provider: provider,
      p_model: team.ai_model?.trim() || configured.defaultModel,
    });
    if (commitError) throw new Error(commitError.message);

    send({ type: "done", notebookId: notebook.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Curation failed.";
    await fail(message);
  }
}
