# Plan — Engineering notebook

Six stages, each with its own validation gate. Stages land in order; each is small enough for one focused session. Implement **one stage at a time**.

## Staging overview

| Stage | Roadmap phase | Ships | Depends on | Why here |
|-------|---------------|-------|------------|----------|
| **A** | Phase 10 | Dated raw notecards + multi-photo attachments + camera capture, on a real page | — | Immediately useful without any AI; proves the capture loop |
| **B** | Phase 11 | Template model, seeded global default, per-team fork, JSON export/import, notebook + section tables | A | The agent needs a target shape to write into; templates must exist before generation |
| **C** | Phase 12 | Server-side curation pipeline (DeepSeek + Moonshot), reference tokens, inline image placement | B | The expensive part; only build once the target schema is proven |
| **D** | Phase 13 | The actual workspace: tab selector, curated pane, notecards pane, manual edit, staleness + Update | C | Puts the pipeline behind a usable surface |
| **E** | Phase 14 | Timeline mode + pageless document mode + switching | D | Navigation over content that must already exist |
| **F** | Phase 15 | Dedicated mobile polish pass + print stylesheet | D (E for timeline) | Moved up per product decision; new pages are responsive from day one regardless |

**Migration numbering** continues from `013_seed_official_catalog_14.sql`. Schema and constraints are deliberately split per the product owner's request, so the schema files can fold into the `001` dump cleanly.

```
014_eng_notes_schema.sql                016_notebook_templates_schema.sql        019_notebook_ai_schema.sql
015_eng_notes_constraints_rls.sql       017_notebook_templates_constraints_rls.sql  020_notebook_ai_constraints_rls.sql
                                        018_seed_notebook_default_template.sql
```

---

## Stage A — Engineering notes foundation (Phase 10)

**Goal:** A teammate can post a dated note with photos in under fifteen seconds, from a laptop or a phone, on the day it happens.

### Migration `014_eng_notes_schema.sql` (tables and columns only)

- [x] `create table if not exists public.eng_notes` — `id uuid pk default gen_random_uuid()`, `team_id uuid not null`, `note_date date not null`, `author_id uuid`, `title text`, `body text not null default ''`, `subteam text`, `task_id uuid`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- [x] `create table if not exists public.eng_note_images` — `id uuid pk default gen_random_uuid()`, `note_id uuid`, `team_id uuid not null`, `storage_path text not null`, `mime_type text`, `byte_size integer`, `caption text`, `position integer not null default 0`, `created_by uuid`, `created_at timestamptz not null default now()`.
- [x] Create the private storage bucket `notebook` if it does not exist.
- [x] No FKs, no indexes, no RLS in this file.

### Migration `015_eng_notes_constraints_rls.sql` (constraints, indexes, RLS)

- [x] Foreign keys: `eng_notes.team_id → teams(id) on delete cascade`, `eng_notes.author_id → profiles(id)`, `eng_notes.task_id → tasks(id) on delete set null`, `eng_note_images.note_id → eng_notes(id) on delete cascade`, `eng_note_images.team_id → teams(id) on delete cascade`, `eng_note_images.created_by → profiles(id)`.
- [x] Checks: `body` length cap, `byte_size > 0`, `position >= 0`, `mime_type` in an allowlist (`image/png`, `image/jpeg`, `image/webp`, `image/heic`).
- [x] Unique index on `eng_note_images(storage_path)`.
- [x] Indexes: `eng_notes(team_id, note_date desc, created_at desc)`, `eng_notes(team_id, updated_at)`, `eng_note_images(note_id, position)`.
- [x] `alter table ... enable row level security` on both tables.
- [x] Policies: members select; members insert with `author_id = auth.uid()` (notes) / `created_by = auth.uid()` (images) and `private.is_team_member(team_id)`; author-or-admin update/delete.
- [x] `grant select, insert, update, delete ... to authenticated`.
- [x] Storage policies on `storage.objects` for bucket `notebook`: read/write only when `(storage.foldername(name))[1]::uuid` is a team the caller belongs to; reject other buckets.

### Client and UI

- [x] `src/lib/notes.ts` — `listNotes({ teamId, date? })`, `createNote`, `updateNote`, `deleteNote`, `addNoteImage`, `signedImageUrls(paths)`.
- [x] `src/lib/types.ts` — `EngNote`, `EngNoteImage`.
- [x] Route `/engineering-notes` (auth-gated, team-scoped like `/parts`), added to `src/app/components/Sidebar.tsx`.
- [x] Composer: date field pre-filled with the browser's local date, free-text body, optional title, optional subteam tag, **Take photo** (`<input type="file" accept="image/*" capture="environment">`) and **Upload** (multi-select).
- [x] Client-side downscale to ≤1600px longest edge and re-encode to JPEG/WebP before upload (keeps free-tier storage and egress sane).
- [x] Note list for the selected date, newest first, with image thumbnails via signed URLs.
- [x] Delete own note (with confirm); edit own note body.

### Gate A

A member can post a note with two photos from a phone, and see it for that date after a refresh. A teammate sees it too. A member of a different team cannot read it, and cannot fetch the stored object even with a guessed path.

---

## Stage B — Templates and notebook shell (Phase 11)

**Goal:** The structure a day's notebook should have is data, not code — editable per team, portable between teams.

### Migration `016_notebook_templates_schema.sql`

- [x] `notebook_templates` — `id`, `team_id uuid` (null = global default), `name text not null`, `description text`, `is_default boolean not null default false`, `created_by uuid`, `created_at`, `updated_at`.
- [x] `notebook_template_tabs` — `id`, `template_id uuid not null`, `name text not null`, `position integer not null default 0`.
- [x] `notebook_template_sections` — `id`, `tab_id uuid not null`, `name text not null`, `position integer not null default 0`, `prompt_hint text`.
- [x] `notebooks` — `id`, `team_id uuid not null`, `notebook_date date not null`, `template_id uuid`, `title text`, `status text not null default 'draft'`, `generated_at`, `generated_by uuid`, `provider text`, `model text`, `source_note_count integer not null default 0`, `source_max_updated_at timestamptz`, `created_at`, `updated_at`.
- [x] `notebook_sections` — `id`, `notebook_id uuid not null`, `tab_name text not null`, `tab_position integer not null default 0`, `section_name text not null`, `section_position integer not null default 0`, `content text not null default ''`, `is_user_edited boolean not null default false`, `edited_by uuid`, `edited_at`.
- [x] `alter table public.teams add column if not exists ai_provider text, add column if not exists ai_model text`.

### Migration `017_notebook_templates_constraints_rls.sql`

- [x] FKs, all `on delete cascade` except `notebooks.template_id → on delete set null` and `generated_by`/`edited_by`/`created_by → profiles(id)`.
- [x] Unique: `notebooks(team_id, notebook_date)`; `notebook_template_tabs(template_id, position)`; `notebook_template_sections(tab_id, position)`.
- [x] Checks: `teams.ai_provider in ('deepseek','moonshot') or null`; `teams.ai_model` length cap; `notebooks.status in ('draft','curated','failed')`.
- [x] Indexes: `notebook_template_tabs(template_id, position)`, `notebook_template_sections(tab_id, position)`, `notebooks(team_id, notebook_date desc)`, `notebook_sections(notebook_id, tab_position, section_position)`.
- [x] RLS: templates — readable when `team_id is null or is_team_member(team_id)`, writable only by admins of that team; global rows read-only to everyone. Notebooks/sections — select by team members; insert/update by team members; delete by admins.
- [x] RPC `private.clone_notebook_template(p_template_id uuid, p_team_id uuid)` (security definer) — copies a template's tabs and sections into a new team-owned template; verifies the caller is an admin and that the source is global or already theirs.
- [x] RPC `private.apply_template_to_notebook(p_notebook_id uuid)` — materializes `notebook_sections` rows for the notebook's template if absent (idempotent).
- [x] Grants for the RPCs; revoke from `anon`.

### Migration `018_seed_notebook_default_template.sql`

- [x] Idempotent insert (`where not exists`) of the global default template `Vulcan Default` with tabs **Software / Hardware / Business**.
- [x] Sections per tab: **Accomplishments**, **Lessons Learned**, **To-be-completed**, each with a short `prompt_hint` (e.g. "3–7 concrete bullets, past tense, name the mechanism or file changed").

### Client and UI

- [x] `src/lib/notebook.ts` — template CRUD (`listTemplates`, `cloneTemplate`, `createTab`, `updateTab`, `deleteTab`, `createSection`, `updateSection`, `deleteSection`, `reorder`), `ensureNotebook(teamId, date)`, `listNotebookDays(teamId)`, `updateSectionContent`.
- [x] Template editor UI — an admin-only panel (dialog or `/engineering-notes/template`) for add/rename/delete/reorder of tabs and sections, plus `prompt_hint` editing.
- [x] Template **export** → download JSON `{ schemaVersion, name, tabs: [{ name, sections: [{ name, promptHint }] }] }`.
- [x] Template **import** ← upload/paste that JSON, validated (shape, name lengths, max 8 tabs, max 12 sections/tab), then cloned into a team template.
- [x] Notebook Markdown export for a single date (sections in tab/section order).

### Gate B

An admin can fork the global default, add a "Programming" tab with a custom section, rename a section, reorder tabs, and export the template. A second team can import that JSON and get an identical structure. Applying the template to a day creates exactly the expected section rows, and re-applying creates no duplicates.

---

## Stage C — AI curation pipeline (Phase 12)

**Goal:** Pressing **Update notebook** turns a day's notes and tasks into a curated, structured notebook with working links back to the source notecards and inline photos — using the team's chosen provider.

### Migration `019_notebook_ai_schema.sql`

- [x] `notebook_runs` — `id`, `notebook_id uuid not null`, `team_id uuid not null`, `provider text`, `model text`, `status text not null default 'running'`, `requested_by uuid`, `started_at`, `finished_at`, `error text`, `note_count integer`, `prompt_tokens integer`, `completion_tokens integer`.
- [x] `notebook_run_events` — `id`, `run_id uuid not null`, `level text not null default 'info'`, `message text not null`, `created_at`.
- [x] `notebook_section_refs` — `id`, `section_id uuid not null`, `kind text not null`, `note_id uuid`, `task_id uuid`, `image_id uuid`.

### Migration `020_notebook_ai_constraints_rls.sql`

- [x] FKs (`on delete cascade` except `note_id`/`task_id`/`image_id` → `on delete set null`).
- [x] Checks: `notebook_runs.status in ('running','succeeded','failed')`; `notebook_run_events.level in ('info','warn','error')`; `notebook_section_refs.kind in ('note','task','image')`; exactly one of `note_id`/`task_id`/`image_id` non-null, matching `kind`.
- [x] Unique: `notebook_section_refs(section_id, kind, coalesce(note_id, task_id, image_id))` to keep backlinks deduplicated.
- [x] Indexes: `notebook_runs(notebook_id, started_at desc)`, `notebook_section_refs(section_id)`, `notebook_section_refs(note_id)`.
- [x] RLS: members select runs/events/refs for their team; insert runs by members; refs written by the requesting member; no cross-team reads.
- [x] A `private.notebook_curation_cooldown_seconds` constant or a small helper returning the seconds since the last successful run for a notebook.

### Server route

- [x] `src/app/api/notebook/curate/route.ts` — `POST`, `export const maxDuration = 60`.
- [x] Authenticate with the caller's Supabase access token; verify team membership server-side before doing anything else.
- [x] Reject when: notes are unchanged since the last successful run (`source_max_updated_at`), the cooldown has not elapsed, or the team has no provider configured.
- [x] Stream NDJSON progress events (`{type:"status"}`, `{type:"tab-done"}`, `{type:"error"}`, `{type:"done"}`) so the UI can show per-tab progress.
- [x] `src/lib/ai/provider.ts` — one OpenAI-compatible client; `deepseek` → `https://api.deepseek.com`, `moonshot` → `https://api.moonshot.cn/v1`; model from `teams.ai_model` with a sane default per provider. Keys read from `DEEPSEEK_API_KEY` / `MOONSHOT_API_KEY` in `process.env` only.
- [x] **One model call per subteam tab, in parallel** — keeps each call small and the wall-clock time inside the function limit.
- [x] Request JSON mode / structured output. Per tab, ask for `{ sections: [{ name, content }] }` where `content` is markdown.
- [x] Prompt contract: assign opaque handles `n1…nN` (notes), `i1…iN` (images), `t1…tN` (tasks); instruct the model to cite with `[[note:n1]]`, embed photos with `[[image:i1]]` in the position where they belong, and reference tasks with `[[task:t1]]`. Forbid inventing handles.
- [x] Server-side rewrite: map each handle back to its UUID and persist `[[note:<uuid>]]` / `[[image:<uuid>]]` / `[[task:<uuid>]]`. Drop any handle that does not resolve, and log a `warn` event.
- [x] Validate every resolved reference belongs to the same team **and** the same `note_date`; otherwise drop.
- [x] Upsert `notebook_sections` content, populate `notebook_section_refs`, update `notebooks` (`status`, `generated_at`, `provider`, `model`, `source_note_count`, `source_max_updated_at`).
- [x] Record token usage on the run; record failures with the provider's error message (never the key).
- [x] `.env.example` / README note documenting the two new server-only env vars.

### Client

- [x] `src/lib/ai.ts` (client) — `curateNotebook(notebookId, onEvent)` consuming the NDJSON stream.
- [x] Settings or team admin surface for choosing `ai_provider` and `ai_model` per team.
- [x] **Update notebook** button with: cooldown countdown, "nothing to curate" state, per-tab progress, and a confirmation dialog when any section has `is_user_edited = true`.

### Gate C

With a real key configured, a day containing 4 notes and 2 images produces a populated notebook for every tab, with citations that scroll/highlight the source notecard and photos rendered inline. Unplugging the API key produces a clear error and a `failed` run row, not a broken page. Re-running with no new notes does not call the model.

---

## Stage D — Notebook workspace UI (Phase 13)

**Goal:** The layout from the requirements: subteam tabs on top, curated notebook as the primary pane, raw notecards on the side, and manual editing that survives.

### Layout

- [x] `/engineering-notes` becomes a three-region layout under the existing `Sidebar`: **top bar** (subteam tab selector · date · mode toggle · Update notebook · Export), **curated pane** (primary, scrollable), **notecards pane** (secondary, sticky on desktop, full-height scroll, composer pinned at its top).
- [x] Date control: previous/next day arrows, a date picker, and a "Today" affordance. Selecting a date calls `ensureNotebook(teamId, date)` so a notebook row exists lazily.
- [x] The selected subteam tab filters both panes: the curated pane shows only that tab's sections; the notecards pane highlights notes tagged with that subteam (and offers "show all").
- [x] Markdown renderer for curated content: `react-markdown` + `rehype-sanitize`, with custom renderers for `[[note:…]]`, `[[task:…]]`, `[[image:…]]` tokens (chips and inline images resolved from fresh signed URLs).
- [x] Manual edit mode per section: textarea or lightweight markdown editor, save sets `content`, `is_user_edited = true`, `edited_by`, `edited_at`.
- [x] Empty states: no notes yet today; notebook not generated yet; template has no sections.
- [x] Staleness banner: "3 notes added since this notebook was generated" with a jump to Update.

### Interaction details

- [x] Clicking a `[[note:…]]` citation scrolls the notecards pane to that card and flashes it.
- [x] Clicking a `[[task:…]]` citation opens the task (reuse the team-tasks surface or a compact modal).
- [x] Clicking a note card's "in notebook" affordance jumps to the citing section when `notebook_section_refs` has a match.
- [x] Optimistic insert for a new note so the composer feels instant.
- [x] Autosave note body on blur; explicit save for section edits.

### Gate D

Two members, one on a laptop and one on a phone, can each post notes; one presses Update; the curated notebook appears with working citations and inline photos; a section is hand-edited and the edit persists across a refresh; the staleness banner appears after a new note is posted.

---

## Stage E — Timeline and document modes (Phase 14)

**Goal:** Moving across the season's notebooks is fast in both directions.

### Timeline mode

- [x] Replace the curated pane with a vertical timeline: one point per date that has notes or a notebook, newest at the top, descending.
- [x] Each point shows the date, subteam dot markers (which subteams have content), note count, and a one-line snippet or the notebook title.
- [x] Points for dates with a curated notebook are visually distinct from note-only dates.
- [x] Clicking a point opens **document mode anchored to that date**.

### Document mode

- [x] Pageless, continuous document: `<h2>` per date, `<h3>` per subteam tab, `<h4>` per section, in chronological order (oldest → newest reads as a season narrative).
- [x] Sticky right-rail outline of dates for fast jumps, plus per-date anchors (`#date-YYYY-MM-DD`) so a point or a shared link lands correctly.
- [x] A **Back to timeline** control that returns to timeline mode preserving scroll position.
- [x] Mode is reflected in the URL (`?mode=timeline|document|day&date=…`) so refresh and back/forward behave.
- [x] Print stylesheet entry point for the current date or the full document (feeds Stage F and the Markdown/PDF export promise).

### Gate E

A team with 10 days of notebooks can switch to timeline, see all 10 points in descending date order, click day 6, land at day 6's anchor in document mode, and press Back to return to the timeline at the same scroll position. Refreshing preserves mode and date.

---

## Stage F — Mobile polish and print (Phase 15)

**Goal:** The notebook is genuinely usable at a competition on a phone, and printable for submission.

- [x] Breakpoint audit of every new surface at 390px, 768px, and 1440px.
- [x] Notecards pane becomes a slide-up sheet on mobile with a persistent "Add note" fab; composer works one-handed.
- [x] Subteam tabs scroll horizontally with a clear active state; no horizontal page scroll.
- [x] Curated sections render at a readable measure; inline photos respect container width; tap targets ≥ 44px.
- [x] Timeline stays vertical single-column; document mode outline collapses into a sticky date breadcrumb.
- [x] Print stylesheet: page breaks between dates, no sidebar, no controls, images sized to the page, headers/footers with team name and date range.
- [x] Touch pass on the existing routes touched by this epic (`/parts` picker already responsive — verify).
- [x] Lighthouse mobile check and a real-device smoke test on iOS Safari + Android Chrome.

### Gate F

A full capture → update → export cycle completes on a mid-range phone without pinch-zoom or horizontal scrolling, and printing the full document produces a submission-quality PDF with photos in place.

---

## Cross-cutting implementation notes

### Reference token contract

Stored markdown uses UUIDs, never model handles:

| Token | Renderer output |
|-------|-----------------|
| `[[note:<uuid>]]` | Inline chip "note · 14:32 · Ada" linking to the notecard |
| `[[task:<uuid>]]` | Inline chip with the task name and status |
| `[[image:<uuid>]]` | `<figure>` with the signed-URL image and optional caption |

Parsing order: tokenize before markdown rendering so tokens cannot be mangled by the markdown parser, and sanitize the remaining markdown strictly.

### Prompt shape (per tab)

```
system: You curate a robotics team's engineering notebook. You are given one day's raw
notes, photos, and tasks for a single subteam. Fill the requested sections.
Rules: use only the supplied handles; cite every factual claim with [[note:nX]];
place photos with [[image:iX]] where they belong; never invent handles; be concrete
and past-tense; no preamble, no closing remarks.

user: { date, tab, sections: [{name, promptHint}],
        notes: [{handle, time, author, body, images:[{handle, caption}]}],
        tasks: [{handle, name, status, assignees}] }

response_format: json_object  →  { "sections": [ { "name": "...", "content": "..." } ] }
```

### Cost and latency guardrails

- Cooldown between runs per notebook; hard skip when `source_max_updated_at` is unchanged.
- Cap notes per prompt (most recent N, default 40) and truncate each body (default 4k chars); log what was dropped.
- One call per tab in parallel; abort the whole run if any tab call fails so a notebook is never half-written (write sections in one transaction-like pass).
- Record `prompt_tokens` / `completion_tokens` per run so cost is visible before it surprises anyone.

### Security checklist

- [x] No `NEXT_PUBLIC_` prefix on either API key.
- [x] Route verifies the caller's JWT and team membership before any model call.
- [x] Model output sanitized; reference handles allowlisted against real rows.
- [x] Private bucket only; signed URLs with short TTL; no public object URLs in stored content.
- [x] RLS on every new table; cross-team probe test in validation.

## Open follow-ups (explicitly not in this epic)

- `can_manage_notebook` permission column on `team_roles` (v1 reuses `is_admin` + cooldown).
- Section revision history and undo.
- `teams.timezone` for cross-timezone date correctness.
- Zip export bundling markdown + image files.
- Voice notes / transcription; OCR of note photos.
- Auto-regeneration on new notes (rejected for v1; revisit if the staleness banner proves annoying).
