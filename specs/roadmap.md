# Roadmap

Ordered delivery phases for Vanta. Each phase should be small enough for one focused agent session (or a short series of task groups). Check boxes when the phase’s validation gate passes.

**How to use:** Agents take the **first incomplete** phase, create a dated feature spec under `specs/YYYY-MM-DD-<slug>/` from `_feature-template/`, then implement. See `SDD-PROMPT.md`.

**Current nav (auth-gated):** Overview `/dashboard` · Personal Tasks `/personal-tasks` · Team `/team` · Team Tasks `/team-tasks` · Parts `/parts` · Settings `/settings`.

**Latest feature pack:** `specs/2026-07-21-vanta-v1-core/`

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
  - [x] SQL migrations for profiles, teams, members, roles, inventory/parts, tasks, subtasks — `supabase/migrations/001_vanta_schema.sql`
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
  - [x] Default roles seeded (Captain, Software, Hardware, Member)
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
- **Validation gate:** New contributor can run from README and understand Vanta from the homepage.

---

## Phase 9 — Mobile adaptation

- **Status:** [ ] Deferred (explicitly out of v1)
- **Goal:** Second adaptation as a mobile app.
- **Depends on:** Stable web v1
- **Deliverables:** TBD
- **Validation gate:** TBD

---

## Changelog discipline

When a phase completes, mark its status `[x]`, tick deliverable boxes, and note the feature directory (e.g. `specs/2026-07-21-vanta-v1-core/`).
