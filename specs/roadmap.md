# Roadmap

Ordered delivery phases for Vulcan. Each phase should be small enough for one focused agent session (or a short series of task groups). Check boxes when the phase’s validation gate passes.

**How to use:** Agents take the **first incomplete** phase, create a dated feature spec under `specs/YYYY-MM-DD-<slug>/` from `_feature-template/`, then implement. See `SDD-PROMPT.md`.

**Current nav (auth-gated):** Overview `/dashboard` · Personal Tasks `/personal-tasks` · Team `/team` · Team Tasks `/team-tasks` · Parts `/parts` · Settings `/settings`.

**Latest feature pack:** `specs/2026-07-21-vulcan-v1-core/`

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

- **Status:** [ ] In progress (picker shipped; identity migration written; vendor crawl running)
- **Goal:** Make the parts catalog fillable from manufacturer data and make the catalog picker scale and searchable.
- **Depends on:** Phase 6
- **Deliverables:**
  - [x] Searchable catalog picker on `/parts` — search by part name, paged browse, official/team grouping — `specs/2026-10-14-official-parts-catalog/`
  - [x] Bounded `searchPartCatalog` query layer replacing the unbounded catalog load (removes the 1000-row PostgREST truncation and whole-catalog egress)
  - [ ] Catalog identity migration `012`: `manufacturer` + `sku` unique key, plus `product_url` / `image_url` / `category` / `source` columns (`011` was already `011_team_delete_cascade.sql`)
  - [ ] Offline ingestion tool + idempotent seed migration `013` (goBILDA and REV). AndyMark, WCP, and Studica are phase 6.6.
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

## Phase 7 — Parts computer-vision identification

- **Status:** [ ] Later
- **Goal:** Assist identification of GoBilda and other FTC-associated parts via a CV model.
- **Depends on:** Phase 6
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

## Phase 9 — Mobile adaptation

- **Status:** [ ] Deferred (explicitly out of v1)
- **Goal:** Second adaptation as a mobile app.
- **Depends on:** Stable web v1
- **Deliverables:** TBD
- **Validation gate:** TBD

---

## Changelog discipline

When a phase completes, mark its status `[x]`, tick deliverable boxes, and note the feature directory (e.g. `specs/2026-07-21-vulcan-v1-core/`).

- 2026-10-07 refinement: team role definition CRUD and permission editing are tracked in `specs/2026-10-07-team-role-management/`. Phase 2 remains complete; migration `010_team_role_management.sql` still requires application and database validation in Supabase.
- 2026-10-14: Phase 6.5 opened — searchable catalog picker shipped (`specs/2026-10-14-official-parts-catalog/`); catalog identity and ingestion migrations were still pending.
- 2026-10-16: Phase 6.5 identity migration is `012_part_catalog_identity.sql` because `011_team_delete_cascade.sql` already exists. The seed is `013_seed_official_catalog_NN.sql` parts, generated by `tools/catalog-ingest/`. AndyMark, West Coast Products, and Studica are phase 6.6.
