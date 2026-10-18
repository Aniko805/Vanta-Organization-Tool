"use client";

import NotebookMarkdown from "@/app/components/NotebookMarkdown";
import TemplateDialog from "@/app/components/TemplateDialog";
import AppShell, {
  EmptyState,
  ErrorText,
  FieldInput,
  Label,
  Panel,
  PrimaryButton,
  SecondaryButton,
} from "@/app/components/AppShell";
import { curateNotebook } from "@/lib/ai";
import type { CurateEvent } from "@/lib/ai/events";
import { formatNotebookDate, formatNoteTime, localDateISO, shiftISODate, shortWeekday } from "@/lib/dates";
import {
  MAX_NOTE_IMAGES,
  addNoteImage,
  attachSignedUrls,
  createNote,
  deleteNote,
  listNoteIndex,
  listNotes,
  listNotesForDates,
  signedImageUrls,
  updateNote,
} from "@/lib/notes";
import {
  NOTEBOOK_COOLDOWN_SECONDS,
  activeTemplate,
  ensureNotebook,
  listNotebookRows,
  listNotebooksForDates,
  listTemplates,
  notebookTabs,
  sourcesUnchanged,
  stalenessCount,
  updateSectionContent,
} from "@/lib/notebook";
import { downloadText, notebookToMarkdown } from "@/lib/notebook-export";
import { supabase } from "@/lib/supabase";
import { listTeamTasks } from "@/lib/tasks";
import { listMyTeams, listTeamMembers, memberCanManageRoleDefinitions } from "@/lib/teams";
import {
  displayNameFromProfile,
  type EngNote,
  type Notebook,
  type NotebookSection,
  type NotebookStatus,
  type NotebookTemplate,
  type Task,
  type Team,
  type TeamMember,
} from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "day" | "timeline" | "document";
type DayPoint = {
  date: string;
  noteCount: number;
  subteams: string[];
  status: NotebookStatus | null;
  snippet: string;
};
type ConfirmSection = { id: string; tabName: string; sectionName: string };

const PAGE_SIZE = 8;

function asMode(value: string | null): Mode {
  return value === "timeline" || value === "document" ? value : "day";
}

function buildDays(
  notes: Pick<EngNote, "note_date" | "subteam" | "body" | "title">[],
  books: Pick<Notebook, "notebook_date" | "status" | "title">[]
): DayPoint[] {
  const days = new Map<string, DayPoint>();
  for (const note of notes) {
    const current = days.get(note.note_date) ?? {
      date: note.note_date,
      noteCount: 0,
      subteams: [],
      status: null,
      snippet: "",
    };
    current.noteCount += 1;
    if (note.subteam && !current.subteams.includes(note.subteam)) current.subteams.push(note.subteam);
    if (!current.snippet) {
      current.snippet = (note.title || note.body || "").replace(/\s+/g, " ").slice(0, 120);
    }
    days.set(note.note_date, current);
  }
  for (const book of books) {
    const current = days.get(book.notebook_date) ?? {
      date: book.notebook_date,
      noteCount: 0,
      subteams: [],
      status: null,
      snippet: book.title ?? "",
    };
    current.status = book.status;
    days.set(book.notebook_date, current);
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export default function EngineeringNotesClient() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = asMode(params.get("mode"));
  const dateParam = params.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : localDateISO();
  const teamParam = params.get("team");

  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string | null>(teamParam);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [notes, setNotes] = useState<EngNote[]>([]);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [templates, setTemplates] = useState<NotebookTemplate[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [days, setDays] = useState<DayPoint[]>([]);
  const [docNotebooks, setDocNotebooks] = useState<Notebook[]>([]);
  const [docNotes, setDocNotes] = useState<EngNote[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [tabChoice, setTabChoice] = useState<string | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState("");
  const [taskModal, setTaskModal] = useState<Task | null>(null);
  const [confirmSections, setConfirmSections] = useState<ConfirmSection[] | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [curating, setCurating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [docTeamId, setDocTeamId] = useState<string | null>(null);
  const [composerDraft, setComposerDraft] = useState<{ pageDate: string; value: string } | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subteam, setSubteam] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const timelineRef = useRef<HTMLDivElement>(null);
  const loadGeneration = useRef(0);

  const team = teams.find((item) => item.id === teamId) ?? null;
  const membership = members.find((item) => item.user_id === userId) ?? null;
  const isAdmin = Boolean(team && userId && memberCanManageRoleDefinitions(team, userId, membership));
  const sections = notebook?.notebook_sections ?? [];
  const tabs = notebookTabs(sections);
  const template = teamId ? activeTemplate(templates, teamId) : null;
  const subteamOptions =
    tabs.map((tab) => tab.name).length > 0
      ? tabs.map((tab) => tab.name)
      : (template?.notebook_template_tabs ?? []).map((tab) => tab.name);
  const selectedTab = tabs.find((tab) => tab.name === tabChoice) ?? tabs[0] ?? null;
  const composerDate = composerDraft?.pageDate === date ? composerDraft.value : date;
  const visibleDocCount = docTeamId === teamId ? docCount : 0;

  const writeQuery = useCallback(
    (next: { mode?: Mode; date?: string; team?: string }, history: "push" | "replace" = "push") => {
      const query = new URLSearchParams(params.toString());
      query.set("mode", next.mode ?? mode);
      query.set("date", next.date ?? date);
      const nextTeam = next.team ?? teamId;
      if (nextTeam) query.set("team", nextTeam);
      const href = `/engineering-notes?${query.toString()}`;
      if (history === "replace") router.replace(href);
      else router.push(href);
    },
    [date, mode, params, router, teamId]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (params.get("mode") && params.get("date")) return;
    writeQuery({ mode, date }, "replace");
  }, [date, mode, params, writeQuery]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setUserId(user.id);
      try {
        const myTeams = await listMyTeams();
        if (!mounted) return;
        setTeams(myTeams);
        const chosen =
          teamParam && myTeams.some((item) => item.id === teamParam)
            ? teamParam
            : myTeams[0]?.id ?? null;
        setTeamId(chosen);
      } catch (caught) {
        if (mounted) setError(caught instanceof Error ? caught.message : "Could not load teams");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [teamParam]);

  const loadDay = useCallback(async (currentTeamId: string, currentDate: string) => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const [dayNotes, book, temps, teamMembers, teamTasks, index, books] = await Promise.all([
        listNotes({ teamId: currentTeamId, date: currentDate }),
        ensureNotebook(currentTeamId, currentDate),
        listTemplates(currentTeamId),
        listTeamMembers(currentTeamId),
        listTeamTasks(currentTeamId).catch(() => []),
        listNoteIndex(currentTeamId),
        listNotebookRows(currentTeamId),
      ]);
      const urls = await signedImageUrls(
        dayNotes.flatMap((note) => (note.eng_note_images ?? []).map((image) => image.storage_path))
      );
      if (generation !== loadGeneration.current) return;
      setNotes(attachSignedUrls(dayNotes, urls));
      setNotebook(book);
      setTemplates(temps);
      setMembers(teamMembers);
      setTasks(teamTasks);
      setDays(buildDays(index, books));
      const teamRow = temps.length >= 0 ? await supabase.from("teams").select("ai_provider, ai_model").eq("id", currentTeamId).single() : null;
      if (teamRow && !teamRow.error && teamRow.data) {
        setTeams((current) =>
          current.map((item) =>
            item.id === currentTeamId
              ? { ...item, ai_provider: teamRow.data.ai_provider, ai_model: teamRow.data.ai_model }
              : item
          )
        );
      }
    } catch (caught) {
      if (generation !== loadGeneration.current) return;
      setError(caught instanceof Error ? caught.message : "Could not load engineering notes");
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (!cancelled) await loadDay(teamId, date);
    })();
    return () => {
      cancelled = true;
    };
  }, [date, loadDay, teamId]);

  useEffect(() => {
    if (mode !== "timeline") return;
    const saved = sessionStorage.getItem(`timeline-scroll:${teamId}`);
    if (timelineRef.current && saved) timelineRef.current.scrollTop = Number(saved);
  }, [mode, teamId, days.length]);

  const oldestDates = useMemo(() => [...days].reverse().map((day) => day.date), [days]);

  const loadDocumentSlice = useCallback(
    async (count: number) => {
      if (!teamId) return;
      const slice = oldestDates.slice(0, count);
      const [books, dayNotes] = await Promise.all([
        listNotebooksForDates(teamId, slice),
        listNotesForDates(teamId, slice),
      ]);
      const urls = await signedImageUrls(
        dayNotes.flatMap((note) => (note.eng_note_images ?? []).map((image) => image.storage_path))
      );
      setDocNotebooks(books);
      setDocNotes(attachSignedUrls(dayNotes, urls));
      setDocCount(slice.length);
      setDocTeamId(teamId);
    },
    [oldestDates, teamId]
  );

  const loadedDocCount = useRef({ teamId: "", count: 0 });

  useEffect(() => {
    if (mode !== "document" || oldestDates.length === 0) return;
    const index = oldestDates.indexOf(date);
    const needed = Math.min(
      oldestDates.length,
      Math.max(PAGE_SIZE, index < 0 ? PAGE_SIZE : index + 1)
    );
    const loadedForTeam = loadedDocCount.current.teamId === teamId ? loadedDocCount.current.count : 0;
    if (loadedForTeam >= needed) {
      document.getElementById(`date-${date}`)?.scrollIntoView({ block: "start" });
      return;
    }
    void loadDocumentSlice(needed)
      .then(() => {
        loadedDocCount.current = { teamId: teamId ?? "", count: needed };
        document.getElementById(`date-${date}`)?.scrollIntoView({ block: "start" });
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not load the document");
      });
  }, [date, loadDocumentSlice, mode, oldestDates, teamId]);

  useEffect(() => {
    const refresh = () => {
      const paths = [...notes, ...docNotes].flatMap((note) =>
        (note.eng_note_images ?? []).map((image) => image.storage_path)
      );
      void signedImageUrls(paths).then((urls) => {
        setNotes((current) => attachSignedUrls(current, urls));
        setDocNotes((current) => attachSignedUrls(current, urls));
      });
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [docNotes, notes]);

  const notesById = useMemo(() => {
    const map = new Map<string, EngNote>();
    for (const note of [...notes, ...docNotes]) map.set(note.id, note);
    return map;
  }, [docNotes, notes]);

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const imagesById = useMemo(() => {
    const map = new Map<string, { url: string | null; caption: string | null }>();
    for (const note of notesById.values()) {
      for (const image of note.eng_note_images ?? []) {
        map.set(image.id, { url: image.signed_url ?? null, caption: image.caption });
      }
    }
    return map;
  }, [notesById]);

  const stale = stalenessCount(notes, notebook);
  const unchanged = sourcesUnchanged(notes, notebook);
  const generatedAt = notebook?.generated_at ? new Date(notebook.generated_at).getTime() : 0;
  const cooldownLeft = Math.max(
    0,
    Math.ceil((generatedAt + NOTEBOOK_COOLDOWN_SECONDS * 1000 - now) / 1000)
  );

  const postNote = async () => {
    if (!teamId || !userId) return;
    if (!body.trim() && files.length === 0) {
      setError("Write a note or add a photo.");
      return;
    }
    if (body.length > 16000) {
      setError("A note can be at most 16000 characters.");
      return;
    }
    if (files.length > MAX_NOTE_IMAGES) {
      setError("A note can have at most 8 photos.");
      return;
    }
    const optimisticId = `temp-${crypto.randomUUID()}`;
    const optimistic: EngNote = {
      id: optimisticId,
      team_id: teamId,
      note_date: composerDate,
      author_id: userId,
      title: title.trim() || null,
      body,
      subteam: subteam.trim() || null,
      task_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      eng_note_images: [],
    };
    if (composerDate === date) setNotes((current) => [optimistic, ...current]);
    setPosting(true);
    setError(null);
    try {
      const created = await createNote({
        teamId,
        authorId: userId,
        noteDate: composerDate,
        title,
        body,
        subteam,
      });
      for (let index = 0; index < files.length; index += 1) {
        await addNoteImage({
          noteId: created.id,
          teamId,
          createdBy: userId,
          file: files[index],
          position: index,
        });
      }
      setTitle("");
      setBody("");
      setFiles([]);
      if (composerDate !== date) writeQuery({ date: composerDate });
      else await loadDay(teamId, date);
    } catch (caught) {
      setNotes((current) => current.filter((note) => note.id !== optimisticId));
      setError(caught instanceof Error ? caught.message : "Could not post the note");
    } finally {
      setPosting(false);
    }
  };

  const runCurate = async (confirmOverwrite: boolean) => {
    if (!notebook || !teamId) return;
    setCurating(true);
    setProgress([]);
    setError(null);
    setStatusLine("Starting update.");
    try {
      await curateNotebook(notebook.id, confirmOverwrite, (event: CurateEvent) => {
        if (event.type === "status") setStatusLine(event.message);
        if (event.type === "tab-done") setProgress((current) => [...current, event.tab]);
        if (event.type === "noop") setStatusLine("Nothing to curate.");
        if (event.type === "cooldown") setStatusLine(`Wait ${event.remainingSeconds}s before updating again.`);
        if (event.type === "confirm") setConfirmSections(event.sections);
        if (event.type === "error") setError(event.message);
        if (event.type === "done") setStatusLine(null);
      });
      await loadDay(teamId, date);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update notebook failed");
    } finally {
      setCurating(false);
    }
  };

  const openNote = (noteId: string) => {
    const note = notesById.get(noteId);
    if (note && note.note_date !== date) {
      writeQuery({ mode: "day", date: note.note_date });
    } else if (mode === "document") {
      writeQuery({ mode: "day" });
    }
    setSheetOpen(true);
    setHighlightId(noteId);
    window.setTimeout(() => {
      document.getElementById(`note-${noteId}`)?.scrollIntoView({ block: "center" });
      window.setTimeout(() => setHighlightId((current) => (current === noteId ? null : current)), 1600);
    }, 50);
  };

  const openTask = async (taskId: string) => {
    const known = tasksById.get(taskId);
    if (known) {
      setTaskModal(known);
      return;
    }
    const { data } = await supabase
      .from("tasks")
      .select("id, team_id, created_by, name, description, status, importance, due_date, is_personal, created_at, updated_at")
      .eq("id", taskId)
      .maybeSingle();
    if (data) setTaskModal(data as Task);
  };

  const exportDate = async (exportDateValue: string) => {
    if (!teamId || !team) return;
    const book =
      exportDateValue === date && notebook
        ? notebook
        : (await listNotebooksForDates(teamId, [exportDateValue]))[0];
    if (!book) return;
    const dayNotes = exportDateValue === date ? notes : await listNotes({ teamId, date: exportDateValue });
    const urls = await signedImageUrls(
      dayNotes.flatMap((note) => (note.eng_note_images ?? []).map((image) => image.storage_path))
    );
    const signedNotes = attachSignedUrls(dayNotes, urls);
    const imageMap = new Map<string, { url: string | null; caption: string | null }>();
    const noteMap = new Map(signedNotes.map((note) => [note.id, note]));
    for (const note of signedNotes) {
      for (const image of note.eng_note_images ?? []) {
        imageMap.set(image.id, { url: image.signed_url ?? null, caption: image.caption });
      }
    }
    downloadText(
      `${team.name}-${exportDateValue}.md`,
      notebookToMarkdown({
        teamName: team.name,
        date: exportDateValue,
        sections: book.notebook_sections ?? [],
        notesById: noteMap,
        imagesById: imageMap,
        tasksById,
      }),
      "text/markdown"
    );
  };

  const printView = async () => {
    if (mode === "document" && visibleDocCount < oldestDates.length) {
      loadedDocCount.current = { teamId: teamId ?? "", count: oldestDates.length };
      await loadDocumentSlice(oldestDates.length);
    }
    window.setTimeout(() => window.print(), 50);
  };

  const jumpToSection = (section: NotebookSection) => {
    setTabChoice(section.tab_name);
    if (mode !== "day") writeQuery({ mode: "day" });
    window.setTimeout(() => {
      document.getElementById(`section-${section.id}`)?.scrollIntoView({ block: "start" });
    }, 50);
  };

  return (
    <AppShell
      workspace
      eyebrow="Engineering notebook"
      title={formatNotebookDate(date)}
      actions={
        <>
          <FieldInput
            as="select"
            className="min-h-11 w-40"
            aria-label="Team"
            value={teamId ?? ""}
            onChange={(event) => {
              const next = event.target.value || null;
              setTeamId(next);
              if (next) writeQuery({ team: next });
            }}
          >
            {teams.length === 0 ? <option value="">No teams</option> : null}
            {teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FieldInput>
          {isAdmin ? (
            <SecondaryButton type="button" className="min-h-11" onClick={() => setTemplateOpen(true)}>
              Template
            </SecondaryButton>
          ) : null}
          <SecondaryButton type="button" className="min-h-11" onClick={() => void exportDate(date)}>
            Export
          </SecondaryButton>
          <SecondaryButton type="button" className="min-h-11" onClick={() => void printView()}>
            Print
          </SecondaryButton>
          <PrimaryButton
            type="button"
            className="min-h-11"
            disabled={curating || !notebook || unchanged || cooldownLeft > 0 || sections.length === 0}
            onClick={() => void runCurate(false)}
          >
            {curating
              ? "Updating"
              : unchanged
                ? "Nothing to curate"
                : cooldownLeft > 0
                  ? `Wait ${cooldownLeft}s`
                  : "Update notebook"}
          </PrimaryButton>
        </>
      }
    >
      <div className="print-sheet hidden print:block mb-4">
        <p className="text-xs font-mono uppercase tracking-widest">{team?.name}</p>
        <p>
          {mode === "document" && oldestDates.length > 0
            ? `${formatNotebookDate(oldestDates[0])} – ${formatNotebookDate(oldestDates[oldestDates.length - 1])}`
            : formatNotebookDate(date)}
        </p>
      </div>
      <ErrorText>{error}</ErrorText>
      {!teamId ? (
        <Panel>
          <EmptyState>Join a team to keep an engineering notebook.</EmptyState>
        </Panel>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="no-print flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 gap-2 overflow-x-auto">
              {tabs.length === 0 ? (
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">No tabs yet</span>
              ) : (
                tabs.map((tab) => (
                  <button
                    key={tab.name}
                    type="button"
                    className={`min-h-11 shrink-0 border-b-2 px-3 text-[10px] font-mono uppercase tracking-widest ${
                      selectedTab?.name === tab.name
                        ? "border-white text-white"
                        : "border-transparent text-zinc-500"
                    }`}
                    onClick={() => setTabChoice(tab.name)}
                  >
                    {tab.name}
                  </button>
                ))
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SecondaryButton type="button" className="min-h-11" onClick={() => writeQuery({ date: shiftISODate(date, -1) })}>
                Prev
              </SecondaryButton>
              <FieldInput
                type="date"
                className="min-h-11 w-36"
                aria-label="Notebook date"
                value={date}
                onChange={(event) => {
                  if (event.target.value) writeQuery({ date: event.target.value });
                }}
              />
              <SecondaryButton type="button" className="min-h-11" onClick={() => writeQuery({ date: shiftISODate(date, 1) })}>
                Next
              </SecondaryButton>
              <SecondaryButton type="button" className="min-h-11" onClick={() => writeQuery({ date: localDateISO() })}>
                Today
              </SecondaryButton>
              <div className="flex border border-zinc-800">
                {(["day", "timeline", "document"] as Mode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`min-h-11 px-3 text-[10px] font-mono uppercase tracking-widest ${
                      mode === item ? "bg-zinc-800 text-white" : "text-zinc-500"
                    }`}
                    onClick={() => writeQuery({ mode: item })}
                  >
                    {item === "document" ? "Doc" : item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {team?.ai_provider ? (
            <p className="no-print text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              {team.ai_provider}
              {team.ai_model ? ` · ${team.ai_model}` : ""}
            </p>
          ) : null}
          {statusLine ? <p className="no-print text-xs font-mono text-zinc-400">{statusLine}</p> : null}
          {progress.length > 0 ? (
            <p className="no-print text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Finished {progress.join(" · ")}
            </p>
          ) : null}
          {stale > 0 ? (
            <button
              type="button"
              className="no-print border border-zinc-700 px-3 py-2 text-left text-xs font-mono text-zinc-300"
              onClick={() => void runCurate(false)}
            >
              {stale} {stale === 1 ? "note" : "notes"} added since this notebook was generated
            </button>
          ) : null}

          <div className={`grid min-h-0 flex-1 gap-3 ${mode === "document" ? "" : "lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]"}`}>
            <section className="print-sheet min-h-0 overflow-y-auto">
              {mode === "timeline" ? (
                <div ref={timelineRef} className="h-full space-y-4 overflow-y-auto border-l border-zinc-800 pl-4">
                  {days.length === 0 ? <EmptyState>No notes yet.</EmptyState> : null}
                  {days.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      className="block min-h-11 w-full text-left"
                      onClick={() => {
                        if (timelineRef.current && teamId) {
                          sessionStorage.setItem(`timeline-scroll:${teamId}`, String(timelineRef.current.scrollTop));
                        }
                        writeQuery({ mode: "document", date: day.date });
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={
                            day.status === "curated"
                              ? "h-3 w-3 shrink-0 rounded-full bg-white"
                              : "h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-500"
                          }
                        />
                        <span className="text-sm font-bold">{formatNotebookDate(day.date).toUpperCase()}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{shortWeekday(day.date)}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1 pl-6">
                        {day.subteams.map((name) => (
                          <span key={name} className="h-1.5 w-1.5 rounded-full bg-zinc-400" title={name} />
                        ))}
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                          {day.noteCount} {day.noteCount === 1 ? "note" : "notes"}
                          {day.status === "curated" ? " · curated" : ""}
                        </span>
                      </span>
                      {day.snippet ? <span className="mt-1 block pl-6 text-xs text-zinc-500">{day.snippet}</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {mode === "document" ? (
                <div className="mx-auto flex max-w-3xl gap-6">
                  <div className="min-w-0 flex-1 space-y-10">
                    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 bg-black/80 py-2 lg:hidden">
                      <Label>Date</Label>
                      <FieldInput
                        as="select"
                        className="min-h-11"
                        aria-label="Jump to date"
                        value={date}
                        onChange={(event) => writeQuery({ mode: "document", date: event.target.value })}
                      >
                        {oldestDates.map((item) => (
                          <option key={item} value={item}>
                            {formatNotebookDate(item)}
                          </option>
                        ))}
                      </FieldInput>
                    </div>
                    {oldestDates.slice(0, visibleDocCount).map((item) => {
                      const book = docNotebooks.find((entry) => entry.notebook_date === item);
                      const bookTabs = notebookTabs(book?.notebook_sections ?? []);
                      return (
                        <article key={item} id={`date-${item}`} className="print-break space-y-4">
                          <h2 className="text-2xl font-extrabold">{formatNotebookDate(item)}</h2>
                          {bookTabs.length === 0 ? <EmptyState>No curated sections for this date.</EmptyState> : null}
                          {bookTabs.map((tab) => (
                            <div key={tab.name} className="space-y-3">
                              <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{tab.name}</h3>
                              {tab.sections.map((section) => (
                                <div key={section.id}>
                                  <h4 className="text-[10px] font-mono uppercase tracking-widest">{section.section_name}</h4>
                                  <NotebookMarkdown
                                    content={section.content}
                                    notesById={notesById}
                                    tasksById={tasksById}
                                    imagesById={imagesById}
                                    onNote={openNote}
                                    onTask={(taskId) => void openTask(taskId)}
                                  />
                                </div>
                              ))}
                            </div>
                          ))}
                        </article>
                      );
                    })}
                    {visibleDocCount < oldestDates.length ? (
                      <SecondaryButton
                        type="button"
                        className="no-print min-h-11"
                        onClick={() => {
                          const next = Math.min(oldestDates.length, visibleDocCount + PAGE_SIZE);
                          loadedDocCount.current = { teamId: teamId ?? "", count: next };
                          void loadDocumentSlice(next);
                        }}
                      >
                        Load more days
                      </SecondaryButton>
                    ) : null}
                  </div>
                  <nav className="no-print sticky top-0 hidden h-fit w-40 shrink-0 lg:block">
                    {oldestDates.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`block min-h-11 w-full border-l px-2 text-left text-[10px] font-mono uppercase tracking-widest ${
                          item === date ? "border-white text-white" : "border-zinc-800 text-zinc-500"
                        }`}
                        onClick={() => writeQuery({ mode: "document", date: item })}
                      >
                        {formatNotebookDate(item)}
                      </button>
                    ))}
                  </nav>
                </div>
              ) : null}

              {mode === "day" ? (
                <div className="space-y-4">
                  {loading ? <EmptyState>Loading notebook.</EmptyState> : null}
                  {!loading && sections.length === 0 ? (
                    <EmptyState>This template has no sections. An admin can fork the default template.</EmptyState>
                  ) : null}
                  {!loading && sections.length > 0 && notebook?.status !== "curated" ? (
                    <EmptyState>
                      {notes.length === 0
                        ? "No notes yet today."
                        : "This notebook has not been generated yet."}
                    </EmptyState>
                  ) : null}
                  {notebook?.status === "curated" && selectedTab
                    ? selectedTab.sections.map((section) => {
                        const cited = (section.notebook_section_refs ?? []).some((ref) => ref.kind === "note");
                        return (
                          <article key={section.id} id={`section-${section.id}`} className="border-t border-zinc-900 pt-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <h2 className="text-[10px] font-mono uppercase tracking-widest">{section.section_name}</h2>
                              <div className="no-print flex items-center gap-2">
                                {section.is_user_edited ? (
                                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Edited</span>
                                ) : null}
                                <SecondaryButton
                                  type="button"
                                  className="min-h-11"
                                  onClick={() => {
                                    setEditingSectionId(section.id);
                                    setSectionDraft(section.content);
                                  }}
                                >
                                  Edit
                                </SecondaryButton>
                              </div>
                            </div>
                            {editingSectionId === section.id ? (
                              <div className="no-print space-y-2">
                                <FieldInput
                                  as="textarea"
                                  value={sectionDraft}
                                  onChange={(event) => setSectionDraft(event.target.value)}
                                />
                                <PrimaryButton
                                  type="button"
                                  className="min-h-11"
                                  disabled={!userId}
                                  onClick={() => {
                                    if (!userId || !notebook) return;
                                    void updateSectionContent({
                                      sectionId: section.id,
                                      content: sectionDraft,
                                      editorId: userId,
                                    })
                                      .then(() => loadDay(notebook.team_id, date))
                                      .catch((caught) =>
                                        setError(caught instanceof Error ? caught.message : "Could not save the section")
                                      );
                                    setEditingSectionId(null);
                                  }}
                                >
                                  Save section
                                </PrimaryButton>
                              </div>
                            ) : section.content ? (
                              <NotebookMarkdown
                                content={section.content}
                                notesById={notesById}
                                tasksById={tasksById}
                                imagesById={imagesById}
                                onNote={openNote}
                                onTask={(taskId) => void openTask(taskId)}
                              />
                            ) : (
                              <EmptyState>{cited ? "This section is empty." : "Nothing written in this section yet."}</EmptyState>
                            )}
                          </article>
                        );
                      })
                    : null}
                </div>
              ) : null}

              {mode === "timeline" ? (
                <div className="no-print mt-4">
                  <SecondaryButton type="button" className="min-h-11" onClick={() => writeQuery({ mode: "day" })}>
                    Back to day
                  </SecondaryButton>
                </div>
              ) : null}
              {mode === "document" ? (
                <div className="no-print mt-4">
                  <SecondaryButton
                    type="button"
                    className="min-h-11"
                    onClick={() => {
                      writeQuery({ mode: "timeline" });
                    }}
                  >
                    Back to timeline
                  </SecondaryButton>
                </div>
              ) : null}
            </section>

            {mode === "document" ? null : (
              <aside
                className={`${sheetOpen ? "flex" : "hidden"} no-print fixed inset-x-0 bottom-0 z-40 h-[72dvh] flex-col border border-zinc-800 bg-zinc-950 p-3 md:static md:z-auto md:flex md:h-auto md:min-h-0 md:bg-zinc-950/40`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <Label>Raw notecards · {notes.length}</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="min-h-11 text-[10px] font-mono uppercase tracking-widest text-zinc-400"
                      onClick={() => setShowAllNotes((current) => !current)}
                    >
                      {showAllNotes ? "Highlight tab" : "Show all"}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 text-[10px] font-mono uppercase tracking-widest text-zinc-400 md:hidden"
                      onClick={() => setSheetOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="mb-3 space-y-2 border border-zinc-900 p-3">
                  <FieldInput
                    type="date"
                    className="min-h-11"
                    aria-label="Note date"
                    value={composerDate}
                    onChange={(event) =>
                      setComposerDraft({ pageDate: date, value: event.target.value })
                    }
                  />
                  <FieldInput
                    placeholder="Title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <FieldInput
                    as="textarea"
                    placeholder="What happened?"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                  {subteamOptions.length > 0 ? (
                    <FieldInput
                      as="select"
                      className="min-h-11"
                      aria-label="Subteam"
                      value={subteam}
                      onChange={(event) => setSubteam(event.target.value)}
                    >
                      <option value="">Untagged</option>
                      {subteamOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </FieldInput>
                  ) : (
                    <FieldInput
                      placeholder="Subteam"
                      value={subteam}
                      onChange={(event) => setSubteam(event.target.value)}
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex min-h-11 cursor-pointer items-center border border-zinc-700 px-3 text-[10px] font-mono uppercase tracking-widest">
                      Take photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(event) => {
                          const picked = [...(event.target.files ?? [])];
                          event.target.value = "";
                          setFiles((current) => [...current, ...picked].slice(0, MAX_NOTE_IMAGES));
                        }}
                      />
                    </label>
                    <label className="inline-flex min-h-11 cursor-pointer items-center border border-zinc-700 px-3 text-[10px] font-mono uppercase tracking-widest">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          const picked = [...(event.target.files ?? [])];
                          event.target.value = "";
                          setFiles((current) => [...current, ...picked].slice(0, MAX_NOTE_IMAGES));
                        }}
                      />
                    </label>
                    <PrimaryButton type="button" className="min-h-11" disabled={posting} onClick={() => void postNote()}>
                      Post
                    </PrimaryButton>
                  </div>
                  {files.length > 0 ? (
                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{files.length} photos ready</p>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                  {notes.length === 0 ? <EmptyState>No notes for this date.</EmptyState> : null}
                  {notes.map((note) => {
                    const matches =
                      showAllNotes ||
                      !selectedTab ||
                      !note.subteam ||
                      note.subteam.toLowerCase() === selectedTab.name.toLowerCase();
                    const canEdit = note.author_id === userId || isAdmin;
                    const citedSection = sections.find((section) =>
                      (section.notebook_section_refs ?? []).some((ref) => ref.note_id === note.id)
                    );
                    return (
                      <article
                        key={note.id}
                        id={`note-${note.id}`}
                        className={`space-y-2 border p-3 ${
                          highlightId === note.id ? "border-white bg-zinc-900" : "border-zinc-900"
                        } ${matches ? "" : "opacity-40"}`}
                      >
                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                          {formatNoteTime(note.created_at)} · {displayNameFromProfile(note.author)}{" "}
                          {note.subteam ? `· ${note.subteam}` : ""}
                        </p>
                        {note.title ? <p className="text-sm font-semibold">{note.title}</p> : null}
                        {editingNoteId === note.id ? (
                          <FieldInput
                            as="textarea"
                            defaultValue={note.body}
                            onBlur={(event) => {
                              const next = event.target.value;
                              setEditingNoteId(null);
                              if (next === note.body) return;
                              void updateNote(note.id, { body: next })
                                .then(() => {
                                  if (teamId) return loadDay(teamId, date);
                                })
                                .catch((caught) =>
                                  setError(caught instanceof Error ? caught.message : "Could not save the note")
                                );
                            }}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm text-zinc-300">{note.body}</p>
                        )}
                        {(note.eng_note_images ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {(note.eng_note_images ?? []).map((image) =>
                              image.signed_url ? (
                                <span key={image.id}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={image.signed_url}
                                    alt={image.caption || "Note photo"}
                                    className="h-16 w-16 border border-zinc-800 object-cover"
                                  />
                                </span>
                              ) : null
                            )}
                          </div>
                        ) : null}
                        {canEdit ? (
                          <div className="flex gap-2">
                            <SecondaryButton type="button" className="min-h-11" onClick={() => setEditingNoteId(note.id)}>
                              Edit
                            </SecondaryButton>
                            <SecondaryButton
                              type="button"
                              className="min-h-11"
                              onClick={() => {
                                if (!window.confirm("Delete this note and its photos?")) return;
                                void deleteNote(note)
                                  .then(() => {
                                    if (teamId) return loadDay(teamId, date);
                                  })
                                  .catch((caught) =>
                                    setError(caught instanceof Error ? caught.message : "Could not delete the note")
                                  );
                              }}
                            >
                              Delete
                            </SecondaryButton>
                            {citedSection ? (
                              <SecondaryButton type="button" className="min-h-11" onClick={() => jumpToSection(citedSection)}>
                                In notebook
                              </SecondaryButton>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </aside>
            )}
          </div>
          {mode === "document" ? null : (
            <button
              type="button"
              className="no-print fixed bottom-4 right-4 z-30 inline-flex h-12 w-12 items-center justify-center bg-white text-2xl text-black md:hidden"
              aria-label="Add note"
              onClick={() => setSheetOpen(true)}
            >
              +
            </button>
          )}
        </div>
      )}

      {templateOpen && teamId ? (
        <TemplateDialog
          teamId={teamId}
          templates={templates}
          provider={team?.ai_provider ?? null}
          model={team?.ai_model ?? null}
          onClose={() => setTemplateOpen(false)}
          onChanged={() => {
            if (teamId) void loadDay(teamId, date);
          }}
        />
      ) : null}

      {confirmSections ? (
        <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 md:items-center">
          <div className="w-full max-w-md space-y-3 border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="text-lg font-bold">Replace edited sections?</h2>
            <p className="text-sm text-zinc-400">Update notebook will replace every section, including these hand edits.</p>
            <ul className="space-y-1 text-xs font-mono uppercase tracking-widest text-zinc-300">
              {confirmSections.map((section) => (
                <li key={section.id}>
                  {section.tabName} · {section.sectionName}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <PrimaryButton
                type="button"
                className="min-h-11"
                onClick={() => {
                  setConfirmSections(null);
                  void runCurate(true);
                }}
              >
                Replace all
              </PrimaryButton>
              <SecondaryButton type="button" className="min-h-11" onClick={() => setConfirmSections(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}

      {taskModal ? (
        <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 md:items-center">
          <div className="w-full max-w-md space-y-2 border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{taskModal.status}</p>
            <h2 className="text-lg font-bold">{taskModal.name}</h2>
            {taskModal.description ? <p className="text-sm text-zinc-300">{taskModal.description}</p> : null}
            <SecondaryButton type="button" className="min-h-11" onClick={() => setTaskModal(null)}>
              Close
            </SecondaryButton>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
