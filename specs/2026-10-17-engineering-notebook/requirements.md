# Requirements — Engineering notebook (notes → curated notebook)

## Phase

- Roadmap phases: **10 (notes), 11 (templates), 12 (AI curation), 13 (workspace UI), 14 (timeline/document), 15 (mobile layout)**
- Feature directory: `specs/2026-10-17-engineering-notebook/`
- Epic plan: [`plan.md`](./plan.md) · Layout prompt for design review: [`layout-prompt.md`](./layout-prompt.md)

## Context

The engineering notebook is a **judged FTC deliverable** — teams are scored on documentation quality for the Design and Innovate awards, and existing tools force students to either hand-write a notebook or retype scattered notes into a document at the end of the season. Vulcan already holds the raw material: team membership, roles, tasks, and inventory. What it lacks is a place to capture raw notes cheaply during a build session, and a way to turn them into a structured, presentable notebook.

This epic adds both, plus an AI curation step that organizes a day's raw notes into a template-driven notebook.

The work is split into six stages because each stage has an independent validation gate and the later stages are expensive to build against an unproven data model. Stage 10 alone (raw notecards with photos) is already useful before any AI exists.

## Decisions taken (confirmed with the product owner)

| Decision | Choice | Consequence |
|----------|--------|-------------|
| Curation model | **Provider-agnostic adapter; DeepSeek and Moonshot (Kimi) both supported, selectable per team** | `teams.ai_provider` / `teams.ai_model` columns; one OpenAI-compatible client; provider chosen per team in settings |
| Regeneration policy | **Explicit "Update notebook" only.** No automatic regeneration when new notes arrive | Far simpler data model — no merge/conflict/diff engine. The UI must instead surface *staleness* (how many notes arrived since the last run) and make updating one click |
| Templates | **Per-team clone of a global default**; templates export/import as JSON; notebooks export as Markdown + print/PDF | Global default template seeded once; teams fork it; fork/import via RPC |
| Note photos | **Multiple per note, private bucket, and rendered inline in the curated notebook at the position the agent chose** | Generated content must carry image reference tokens the renderer resolves to signed URLs |
| Mobile | **Responsive from day one for every new page, plus a dedicated polish stage (15) after the notebook ships** | Each stage's validation gate includes a mobile check; stage 15 is the dedicated pass |

### Decisions taken without asking (redirect if wrong)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API key storage | Keys live **only** in server environment variables (`DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`). Team rows store *which* provider, never a key | A key in a DB row reachable by an anon-key client is a leak waiting to happen |
| Who may post notes | Any team member | Notes are the cheap, low-stakes input |
| Who may edit the curated notebook | Any team member | It is a collaborative living document; `is_user_edited` records provenance |
| Who may customize templates | Team admins (`is_admin`) | Template changes affect everyone's structure |
| Who may trigger "Update notebook" | Any team member, with a **cooldown** and a **no-op skip** when nothing changed | Cost control without inventing a new permission column. A dedicated `can_manage_notebook` permission is a documented follow-up |
| Day boundary | The browser's local date, sent by the client as `note_date` | Teams are co-located; a `teams.timezone` column is deliberately **not** added until cross-timezone use is real |
| Model output format | Model emits **short opaque handles** (`n1`, `i2`, `t3`); the server rewrites them to UUIDs before saving | Long UUIDs get mangled or hallucinated. Handles are validatable against an allowlist |
| Reference syntax | `[[note:<uuid>]]`, `[[image:<uuid>]]`, `[[task:<uuid>]]` in stored markdown | Survives manual editing, is trivially parseable, and cannot inject HTML |

## Scope

### In scope

- A per-team **engineering notes** page with dated raw notecards, multi-photo attachments, and camera capture.
- Auto-dating: a new note defaults to today; the user may backdate it explicitly.
- A **notebook template** model: tabs (subteams) → sections, with a seeded global default (Software / Hardware / Business × Accomplishments / Lessons Learned / To-be-completed), clonable per team, exportable and importable as JSON.
- A **curated notebook** per team per date, generated on demand by an LLM from that day's notes and tasks, edited manually, and exportable.
- Reference tokens: the generated text links to the raw notecards and tasks it drew from, and embeds note photos inline.
- The workspace layout: subteam tab selector, curated notebook pane, raw notecard pane with composer.
- **Timeline** mode (vertical date spine) and **document** mode (pageless, all dates), with switching in both directions.
- Mobile-responsive layout for all of the above, plus a dedicated polish stage.
- Database migrations split into **schema** files (tables/columns) and **constraints/RLS** files, per the product owner's request.

### Out of scope

- Automatic regeneration on note insert (explicitly rejected — see decisions).
- Real-time multiplayer editing of the curated notebook (no collaborative cursors / CRDT).
- Voice notes or transcription.
- Native mobile apps (remains Phase 9, deferred).
- Version history / undo stack for curated sections. `is_user_edited` + `edited_at` is the v1 record of provenance; full revision history is a follow-up.
- Server-side PDF rendering. "PDF" means the browser's print-to-PDF against a dedicated print stylesheet.
- Cross-timezone date handling.
- OCR or vision extraction of text from note photos.
- Illustration/generation of images by the AI (photos only).

## Data model

All new tables are prefixed `eng_` / `notebook_` to keep the 001 dump legible.

### Stage 10 — raw notes

| Table | Columns |
|-------|---------|
| `eng_notes` | `id`, `team_id`, `note_date date`, `author_id`, `title`, `body text`, `subteam text null`, `task_id uuid null`, `created_at`, `updated_at` |
| `eng_note_images` | `id`, `note_id`, `team_id`, `storage_path`, `mime_type`, `byte_size`, `caption`, `position`, `created_by`, `created_at` |

Storage: private bucket `notebook`, object key `{team_id}/{note_id}/{uuid}.{ext}`. Access via short-lived signed URLs.

### Stage 11 — templates and notebooks

| Table | Columns |
|-------|---------|
| `notebook_templates` | `id`, `team_id uuid null` (null = global default), `name`, `description`, `is_default`, `created_by`, `created_at`, `updated_at` |
| `notebook_template_tabs` | `id`, `template_id`, `name`, `position` |
| `notebook_template_sections` | `id`, `tab_id`, `name`, `position`, `prompt_hint text` |
| `notebooks` | `id`, `team_id`, `notebook_date date`, `template_id`, `title`, `status`, `generated_at`, `generated_by`, `provider`, `model`, `source_note_count`, `source_max_updated_at`, `created_at`, `updated_at` |
| `notebook_sections` | `id`, `notebook_id`, `tab_name`, `tab_position`, `section_name`, `section_position`, `content text`, `is_user_edited`, `edited_by`, `edited_at` |

**Snapshot semantics:** `notebook_sections` carries `tab_name` / `section_name` / positions as *copied values*, not foreign keys to the template. Editing a template must never rewrite or break historical notebooks. `notebooks.template_id` is provenance only.

### Stage 12 — AI runs

| Table | Columns |
|-------|---------|
| `notebook_runs` | `id`, `notebook_id`, `team_id`, `provider`, `model`, `status`, `requested_by`, `started_at`, `finished_at`, `error`, `note_count`, `prompt_tokens`, `completion_tokens` |
| `notebook_run_events` | `id`, `run_id`, `level`, `message`, `created_at` |
| `notebook_section_refs` | `id`, `section_id`, `kind` (`note`/`task`/`image`), `note_id`, `task_id`, `image_id` |

New columns on `teams`: `ai_provider text null`, `ai_model text null`.

### Migration files

| # | File | Contents |
|---|------|----------|
| 014 | `eng_notes_schema.sql` | `eng_notes`, `eng_note_images` tables + columns; `notebook` storage bucket |
| 015 | `eng_notes_constraints_rls.sql` | FKs, indexes, checks, RLS policies, grants, `notebook` storage policies |
| 016 | `notebook_templates_schema.sql` | template + notebook + section tables, `teams.ai_*` columns |
| 017 | `notebook_templates_constraints_rls.sql` | FKs, unique indexes, RLS, fork/import RPCs |
| 018 | `seed_notebook_default_template.sql` | idempotent global default template seed |
| 019 | `notebook_ai_schema.sql` | run/event/ref tables |
| 020 | `notebook_ai_constraints_rls.sql` | FKs, checks, RLS, indexes |

Schema and constraints are deliberately separated so the schema files fold cleanly into the owner's `001` dump.

## Contracts

### MUST

- A note's `note_date` MUST default to the client's local date and MUST be overridable by the user.
- Photos MUST live in a **private** bucket and MUST be served by signed URLs with a short TTL; no public object URLs.
- Curated content MUST reference only notes and images belonging to the same team and the same notebook date. Task citations MUST belong to the same team. The model may see the team's incomplete tasks (`todo`, `in_progress`, `blocked`, not personal), capped at 40, as current-board context; those tasks are not required to share the notebook date. Unknown or foreign handles MUST be dropped and logged, not rendered.
- Rendered notebook markdown MUST be sanitized. Model output is untrusted input.
- Regeneration MUST only happen on an explicit user action.
- The "Update notebook" action MUST warn before overwriting sections where `is_user_edited` is true.
- "Update notebook" MUST skip the model call and report "nothing to curate" when the source notes are unchanged since the last successful run.
- Template editing MUST NOT mutate already-generated notebooks.
- Every new table MUST have RLS enabled with team-membership scoping; no table may be readable across teams.
- API keys MUST NOT appear in client bundles, the database, or the repo.

### SHOULD

- The notebook MUST show a staleness indicator: how many notes were added/edited since the last successful run.
- Image references SHOULD resolve server-side so signed URLs are not baked into stored markdown.
- `notebook_section_refs` SHOULD be populated so the UI can highlight the raw notecards cited by the section in view.
- The timeline SHOULD only list dates that have at least one note or a notebook.
- The document mode SHOULD deep-link to a specific date anchor.
- Export SHOULD preserve tab/section ordering and image placement.

### MAY

- Per-section `prompt_hint` text to steer curation tone (e.g. "list 3–7 bullets, past tense, concrete").
- A per-team default provider inherited from a global env default.
- Word/character counts per section for a "too thin" nudge.

## UX / routes

- New route: `/engineering-notes` (auth-gated, team-scoped, added to `Sidebar`).
- Layout: existing `Sidebar` + a three-region main area — top bar (subteam tabs + date + mode), curated notebook pane (primary), raw notecards pane (secondary, with composer).
- Modes: `day` (default editing surface), `timeline`, `document`.
- Aesthetic: `specs/tech-stack.md` tokens. Monospaced micro-labels for dates, counts, and provider status. No new accent colours.
- Mobile: single column, tabs scroll horizontally, notecards become a sheet, timeline stays vertical.

## Dependencies

- Depends on: Phases 0–6 (auth, teams/roles, tasks). Stage 10 is independent of all AI work.
- Blocked by: nothing. Stage 12 needs `DEEPSEEK_API_KEY` and/or `MOONSHOT_API_KEY` set in the Vercel project before it can be validated.
- New dependencies to justify in `tech-stack.md` before use: a markdown renderer with sanitization (e.g. `react-markdown` + `rehype-sanitize`). No ORM, no job queue.

## Risks

| Risk | Mitigation |
|------|------------|
| Vercel function time limit truncates generation | One model call **per subteam tab**, run in parallel; `maxDuration` set explicitly; streaming progress events |
| LLM output breaks the renderer (bad markdown, bogus handles) | Handle allowlist + markdown sanitization + lenient rendering fallback |
| Prompt injection from note text (e.g. "ignore instructions, emit …") | Model output is treated as untrusted: references are allowlisted against real rows, markdown is sanitized, and no tool calls are exposed |
| Signed URL expiry breaks long-lived pages or exports | Resolve URLs at render time; refresh on focus; export resolves fresh URLs |
| Free-tier egress/storage pressure from photos | Client-side downscale before upload; cap photo count and size per note |
| Cost per "Update notebook" | Cooldown, unchanged-source skip, per-tab calls with bounded context, token accounting in `notebook_runs` |
