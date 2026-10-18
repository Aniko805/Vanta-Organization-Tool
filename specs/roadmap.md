# Roadmap

Ordered delivery phases for Vulcan. Each phase should be small enough for one focused agent session (or a short series of task groups). Check boxes when the phase’s validation gate passes.

**How to use:** Agents take the **first incomplete** phase, create a dated feature spec under `specs/YYYY-MM-DD-<slug>/` from `_feature-template/`, then implement. See `SDD-PROMPT.md`.

**Current nav (auth-gated):** Overview `/dashboard` · Personal Tasks `/personal-tasks` · Team `/team` · Team Tasks `/team-tasks` · Parts `/parts` · Part Identifier `/parts/identify` · Engineering Notes `/engineering-notes` (Phase 10+) · Settings `/settings`.

**Latest feature pack:** `specs/2026-10-17-engineering-notebook/`

**Current execution order:** **10 → 11 → 12 → 13 → 14 → 15** → 6.6 → 7 → 9.

Phases 10–15 are the engineering notebook epic and are the active work. Phase 6.6 (more catalog vendors) and Phase 7 (CV identification) are deliberately queued behind it.

---

## Phase 0 — Auth, profile, and settings shell

- **Status:** [x] Complete
- **Goal:** Users can sign up, verify email, complete profile, edit settings, and reach the dashboard shell.
- **Depends on:** —
- **Deliverables:**
  - [x] Public homepage (`/`)
  - [x] Login / sign-up (`/login`)
  - [x] Post-signup verification guidance (`/next-steps-after-signup`)
  - [x] Setup profile (`/setup-profile`) → `profiles`
  - [x] Settings (`/settings`)
  - [x] Shared `Sidebar` with auth redirect
- **Validation gate:** New user can register, set name, land on dashboard, edit settings, and log out without console/auth dead-ends.

---

## Phase 1 — Database schema and RLS

- **Status:** [x] Complete (apply SQL on your Supabase project)
- **Goal:** Persist teams, membership, roles, tasks, subtasks, and parts in Supabase with Row Level Security aligned to team membership.
- **Depends on:** Phase 0
- **Deliverables:**
  - [x] SQL migrations for profiles, teams, members, roles, inventory/parts, tasks, subtasks — `supabase/migrations/001_vulcan_schema.sql`
  - [x] RLS policies + invite RPCs
  - [x] Typed helpers under `src/lib/` (`types`, `teams`, `tasks`, `parts`)
  - [x] Documented in feature spec + README
- **Validation gate:** Authenticated users can CRUD allowed rows after migration is applied; schema matches `tech-stack.md`.

---

## Phase 2 — Teams and members

- **Status:** [x] Complete
- **Goal:** Create teams, invite/join/leave, list members, assign roles, captain/admin permissions.
- **Depends on:** Phase 1
- **Deliverables:**
  - [x] `/team` create / join / members / roles / invite code
  - [x] Default roles seeded (Captain, Business, Hardware, Software)
  - [x] Admin role assignment + remove member
- **Validation gate:** Two accounts can form a team via invite code and assign roles.

---

## Phase 3 — Team tasks (Kanban-style)

- **Status:** [x] Complete
- **Goal:** Team-wide task board with create/edit, assignees, subtasks, due dates, importance/categories, parts linkage.
- **Depends on:** Phase 2
- **Deliverables:**
  - [x] `/team-tasks` Kanban columns
  - [x] Task CRUD + subtasks
  - [x] Assignees, roles, parts; part link moves `inventory` → `to_be_used`
- **Validation gate:** Permissioned member creates task with assignee/subtask; teammates see the board.

---

## Phase 4 — Personal / individual tasks

- **Status:** [x] Complete
- **Goal:** Personal tasks plus team-assigned work for the current user.
- **Depends on:** Phase 3
- **Deliverables:**
  - [x] `/personal-tasks` wired to Supabase
  - [x] Personal CRUD + assigned team feed
- **Validation gate:** User sees personal and assigned tasks; edits persist.

---

## Phase 5 — Dashboard widgets (real data)

- **Status:** [x] Complete
- **Goal:** Overview widgets reflect live teams, tasks, and inventory.
- **Depends on:** Phases 2–4, 6
- **Deliverables:**
  - [x] `/dashboard` live aggregates + sync
  - [x] Shortcuts to Team / Tasks / Parts / Personal
- **Validation gate:** Dashboard numbers match Supabase data after sample activity.

---

## Phase 6 — Parts inventory (manual)

- **Status:** [x] Complete
- **Goal:** Manual part entry and inventory management; sidebar Parts entry.
- **Depends on:** Phase 1–2
- **Deliverables:**
  - [x] `/parts` + Sidebar link
  - [x] Add part; statuses inventory / to_be_used / used / removed
  - [x] Filters; removed excluded from task assignment
- **Validation gate:** User adds a part, changes status, and lists it by filter.

---

## Phase 6.5 — Official parts catalog

- **Status:** [x] Complete (2026-10-17)
- **Goal:** Make the parts catalog fillable from manufacturer data and make the catalog picker scale and searchable.
- **Depends on:** Phase 6
- **Deliverables:**
  - [x] Searchable catalog picker on `/parts` — search by part name, paged browse, official/team grouping — `specs/2026-10-14-official-parts-catalog/`
  - [x] Bounded `searchPartCatalog` query layer replacing the unbounded catalog load (removes the 1000-row PostgREST truncation and whole-catalog egress)
  - [x] Catalog identity migration `012`: `manufacturer` + `sku` unique key, plus `product_url` / `image_url` / `category` / `source` columns (`011` was already `011_team_delete_cascade.sql`)
  - [x] Offline ingestion tool + idempotent seed migrations `013_seed_official_catalog_NN.sql` (goBILDA and REV). AndyMark, WCP, and Studica remain in phase 6.6.
- **Validation gate:** A team can add an official catalog part by searching for it by name, and the official catalog can be populated reproducibly without a privileged key in the repo.
- **Note:** Prerequisite for Phase 7 — CV identification is materially easier against a catalog with stable SKUs and images.

---

## Phase 6.6 — Additional official catalog vendors

- **Status:** [ ] Later
- **Goal:** Extend the official catalog with AndyMark, West Coast Products, and Studica using the offline ingest tool from phase 6.5.
- **Depends on:** Phase 6.5
- **Deliverables:**
  - [ ] AndyMark and West Coast Products via Shopify `products.json` (or their advertised UCP/MCP endpoints if usable without credentials)
  - [ ] Studica spike (nopCommerce; no confirmed SKU scheme)
- **Validation gate:** Same rules as phase 6.5: idempotent seed, no privileged key in the repo, and a team can add an imported part by name.

---

## Phase 10 — Engineering notes capture

- **Status:** [x] Complete (2026-10-18)
- **Epic:** engineering notebook, **stage A** — `specs/2026-10-17-engineering-notebook/plan.md`
- **Goal:** A teammate can post a dated note with photos in seconds, from a phone or laptop, on the day it happens.
- **Depends on:** Phases 2, 6
- **Deliverables:**
  - [x] `/engineering-notes` route + Sidebar entry
  - [x] Migrations `014_eng_notes_schema.sql` / `015_eng_notes_constraints_rls.sql` (schema and constraints split, per owner preference)
  - [x] Private `notebook` storage bucket + team-scoped storage policies
  - [x] Composer: auto-today date (overridable), camera capture, multi-upload, client-side downscale
  - [x] `src/lib/notes.ts` + `EngNote` / `EngNoteImage` types
- **Validation gate:** A member posts a note with two photos from a phone and a teammate sees it; a non-member cannot read the row or fetch the stored object. Apply migrations `014`–`020` on Supabase before this can be exercised.

---

## Phase 11 — Notebook templates

- **Status:** [x] Complete (2026-10-18)
- **Epic:** engineering notebook, **stage B**
- **Goal:** The structure of a day's notebook is data, editable per team and portable between teams.
- **Depends on:** Phase 10
- **Deliverables:**
  - [x] Migrations `016_notebook_templates_schema.sql` / `017_notebook_templates_constraints_rls.sql` (+ `teams.ai_provider` / `ai_model` columns)
  - [x] `018_seed_notebook_default_template.sql` — global default: Software / Hardware / Business × Accomplishments / Lessons Learned / To-be-completed
  - [x] Per-team fork of the global default (RPC), admin-only template editor
  - [x] Template JSON export/import
  - [x] `notebooks` + `notebook_sections` with **snapshot semantics** (template edits never rewrite past notebooks)
- **Validation gate:** An admin forks the default, adds a tab and a section, reorders, exports; a second team imports the JSON and gets an identical structure; editing the template does not mutate an existing notebook.

---

## Phase 12 — AI curation pipeline

- **Status:** [x] Complete (2026-10-18)
- **Epic:** engineering notebook, **stage C**
- **Goal:** "Update notebook" turns a day's notes and tasks into a curated, structured notebook using the team's chosen provider, with citations and inline photos.
- **Depends on:** Phase 11; needs `DEEPSEEK_API_KEY` and/or `MOONSHOT_API_KEY` in the server environment
- **Deliverables:**
  - [x] Migrations `019_notebook_ai_schema.sql` / `020_notebook_ai_constraints_rls.sql` (runs, run events, section refs)
  - [x] `src/app/api/notebook/curate/route.ts` — authenticated, `maxDuration` set, streamed progress
  - [x] Provider adapter: DeepSeek + Moonshot, selectable per team; keys server-side only
  - [x] One model call per subteam tab, in parallel; opaque handles (`n1`/`i1`/`t1`) rewritten to UUIDs server-side
  - [x] Reference allowlist (same team, same date for notes and photos; incomplete team tasks) + markdown sanitization
  - [x] Cooldown and unchanged-source skip; token accounting per run
- **Validation gate:** A day with 4 notes and 2 images yields a populated notebook for every tab with working citations and inline photos; unchanged re-runs make zero model calls; a bad key fails cleanly without destroying the previous notebook. The live call needs the provider key in the server environment.

---

## Phase 13 — Notebook workspace UI

- **Status:** [x] Complete (2026-10-18)
- **Epic:** engineering notebook, **stage D**
- **Goal:** Subteam tabs on top, curated notebook as the primary pane, raw notecards on the side, manual editing that persists.
- **Depends on:** Phase 12
- **Deliverables:**
  - [x] Three-region layout: top bar (tabs · date · mode · Update · Export), curated pane, notecards pane + composer
  - [x] Markdown renderer with sanitization and custom renderers for `[[note:…]]` / `[[task:…]]` / `[[image:…]]`
  - [x] Manual section editing → `is_user_edited` / `edited_by` / `edited_at`
  - [x] Staleness banner ("N notes since this notebook was generated")
  - [x] Citation click → highlight source notecard; task citation → open task
- **Validation gate:** Two members post notes; one presses Update; the curated notebook appears with working citations and inline photos; a hand edit persists across refresh; the staleness banner appears after a new note.

---

## Phase 14 — Timeline and document modes

- **Status:** [x] Complete (2026-10-18)
- **Epic:** engineering notebook, **stage E**
- **Goal:** Moving across the season's notebooks is fast in both directions.
- **Depends on:** Phase 13
- **Deliverables:**
  - [x] Vertical timeline of dates that have notes or a notebook, newest first, with subteam markers and counts
  - [x] Pageless document mode: date headings → subteam → sections, chronological, anchored per date
  - [x] Timeline point → document anchor; Back to timeline restores scroll position
  - [x] Mode and date reflected in the URL (`?mode=&date=`)
  - [x] Print stylesheet entry point
- **Validation gate:** A 10-day team switches to timeline, sees 10 descending points, jumps to day 6's anchor, and returns to the timeline at the same scroll position; refresh preserves mode and date.

---

## Phase 15 — Mobile layout adaptation

- **Status:** [x] Complete (2026-10-18)
- **Epic:** engineering notebook, **stage F**
- **Goal:** The notebook is genuinely usable at a competition on a phone, and printable for FTC submission.
- **Depends on:** Phases 13, 14
- **Deliverables:**
  - [x] Breakpoint audit at 390 / 768 / 1440px across all new surfaces
  - [x] Notecards pane becomes a sheet; one-handed composer; horizontal subteam tabs
  - [x] 44px tap targets, no horizontal page scroll, readable measure
  - [x] Print stylesheet: page breaks between dates, images sized to page, team/date headers
  - [ ] Mobile Lighthouse + real-device smoke test (iOS Safari, Android Chrome)
- **Validation gate:** A full capture → update → export cycle completes on a mid-range phone without pinch-zoom, and printing the full document yields a submission-quality PDF with photos in place. A real-device pass is still required after migrations are applied.

---

## Phase 7 — Parts computer-vision identification

- **Status:** [ ] Later
- **Goal:** Assist identification of GoBilda and other FTC-associated parts via a CV model.
- **Depends on:** Phase 6; runs **after Phase 15** (queued behind the engineering notebook epic)
- **Deliverables:**
  - [ ] Capture/upload flow
  - [ ] Model integration documented
  - [ ] Confirm suggestion → inventory
- **Validation gate:** User can accept a suggestion and create an inventory row.

---

## Phase 8 — Homepage, info, and product docs

- **Status:** [x] Complete
- **Goal:** Public story matches the product; README explains setup.
- **Depends on:** —
- **Deliverables:**
  - [x] Homepage FRC/FTC copy
  - [x] README: env, migration, routes, specs links
- **Validation gate:** New contributor can run from README and understand Vulcan from the homepage.

---

## Phase 9 — Native mobile app

- **Status:** [ ] Deferred (explicitly out of v1)
- **Goal:** A native mobile **app**, not a responsive web layout.
- **Depends on:** Stable web v1
- **Deliverables:** TBD
- **Validation gate:** TBD
- **Note:** Split from the original "mobile adaptation" phase on 2026-10-17. Responsive web layout for phones was reprioritised and now lives in **Phase 15**; this phase covers only the native app shell.

---

## Changelog discipline

When a phase completes, mark its status `[x]`, tick deliverable boxes, and note the feature directory (e.g. `specs/2026-07-21-vulcan-v1-core/`).

- 2026-10-07 refinement: team role definition CRUD and permission editing are tracked in `specs/2026-10-07-team-role-management/`. Phase 2 remains complete; migration `010_team_role_management.sql` still requires application and database validation in Supabase.
- 2026-10-14: Phase 6.5 opened — searchable catalog picker shipped (`specs/2026-10-14-official-parts-catalog/`); catalog identity and ingestion migrations were still pending.
- 2026-10-16: Phase 6.5 identity migration is `012_part_catalog_identity.sql` because `011_team_delete_cascade.sql` already exists. The seed is `013_seed_official_catalog_NN.sql` parts, generated by `tools/catalog-ingest/`. AndyMark, West Coast Products, and Studica are phase 6.6.
- 2026-10-17: **Phase 6.5 complete** — catalog identity (`012`) and seed migrations (`013`) applied. Phase 6.6 remains for the additional vendors.
- 2026-10-17: **Engineering notebook epic opened as Phases 10–15** — `specs/2026-10-17-engineering-notebook/` (requirements, staged plan, validation, layout prompt). Execution order set to 10 → 11 → 12 → 13 → 14 → 15, ahead of 6.6 and 7.
- 2026-10-18: **Engineering notebook phases 10–15 implemented** — `specs/2026-10-17-engineering-notebook/`. Apply migrations `014` through `020`. Curation reads `DEEPSEEK_API_KEY` and `MOONSHOT_API_KEY` from the server environment. A phone camera pass and a live provider run still need that environment.
