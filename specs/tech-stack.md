# Tech Stack

Source of truth for languages, libraries, conventions, design tokens, and deliberate exclusions. Agents MUST follow this file when implementing features.

## Runtime and framework

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | TypeScript 5 | Strict typing preferred for new code |
| Framework | Next.js 16.2.x | App Router under `src/app` |
| UI | React 19.2.x | Interactive pages use `"use client"` at the top of the component |
| Markdown | `react-markdown` + `rehype-sanitize` | Curated notebook text. Model output is sanitized before display |
| Styling | Tailwind CSS v4 | Via `@tailwindcss/postcss` |
| Lint | ESLint + `eslint-config-next` | `npm run lint` |
| Package manager | npm (repo default) | Match existing lockfile |

**Important:** This Next.js major version differs from older training data. Read guides under `node_modules/next/dist/docs/` before using unfamiliar APIs. See root `AGENTS.md`.

## Backend and data

| Layer | Choice | Notes |
|-------|--------|-------|
| Auth + DB | Supabase (Auth + Postgres) | `@supabase/supabase-js` |
| Client | `src/lib/supabase.ts` | `createClient` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Auth helpers | `src/lib/auth.ts` | Profile read/update, display name, completion checks |
| ORM | None | Query via Supabase client; do not add Prisma unless a roadmap phase says so |

### Environment and secrets

- Only public anon keys and URL may live in client-accessible env vars (`NEXT_PUBLIC_*`).
- Never commit `.env`, service role keys, or other secrets.
- Soft “DB Active” checks on the homepage only verify the client is configured—not full schema health.

### Existing data (today)

- Supabase `profiles` table is in use (id, first_name, last_name, username, avatar_url, bio, …).
- Teams, tasks, parts, and roles tables are **target schema** (below)—not yet guaranteed to exist in the project Supabase project.

## Hosting

- **Frontend:** Vercel (free plan)
- **Backend:** Supabase (free plan)
- Open-source GitHub repository; documentation and product specs live in-repo under `specs/`

## Project layout conventions

```
src/
  app/
    page.tsx                 # Public homepage
    login/                   # Auth
    next-steps-after-signup/
    setup-profile/
    dashboard/               # Overview (auth-gated)
    personal-tasks/
    team/
    team-tasks/              # Team Kanban
    parts/                   # Inventory
    engineering-notes/       # Dated notes and curated notebook
    settings/
    components/              # Shared UI (Sidebar, AppShell, ui.ts design tokens)
  lib/
    supabase.ts
    auth.ts
    types.ts
    teams.ts
    tasks.ts
    parts.ts
public/
supabase/migrations/         # Apply *.sql in numeric order (skip deprecated/)
specs/                       # SDD constitution + feature specs
tools/catalog-ingest/        # Offline vendor catalog fetch; not imported by the app
```

### Routing and pages

- Prefer App Router folders with `page.tsx` per route.
- Auth-gated tool routes redirect unauthenticated users to `/login` (pattern already used in `Sidebar`).
- Sidebar nav: Overview (`/dashboard`), Personal Tasks (`/personal-tasks`), Team (`/team`), Team Tasks (`/team-tasks`), Parts (`/parts`), Engineering Notes (`/engineering-notes`), Settings (`/settings`).

### Interactive vs server components

- Existing tool pages are largely client components (`"use client"`).
- Keep that pattern unless a phase explicitly introduces server components / Server Actions and documents why in the feature spec.

## Design system (Vulcan aesthetic)

**Dark-mode glassmorphism** (superseded the earlier Vercel-style black/white/sharp-corner tokens on 2026-10-23). Curved geometry, translucent zinc glass, emerald-to-cyan accents. The tokens live as literal class strings in `src/app/components/ui.ts`; use those constants (or the `AppShell` primitives built from them) instead of re-typing classes.

| Token | Guidance |
|-------|----------|
| Geometry | Never `rounded-none` / `rounded-sm` / `rounded-md`. Inputs and buttons `rounded-xl`; cards and panels `rounded-2xl`; modals and sheets `rounded-3xl` (`rounded-t-3xl` bottom sheet below `md`) |
| Page background | `bg-zinc-950 text-zinc-100` plus a top radial glow (`PAGE_BG`) |
| Glass surface | `bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50` (`GLASS`, `CARD`) |
| Hover / active | `hover:bg-zinc-800/50 hover:border-white/20 transition-all duration-300 ease-out` (`GLASS_HOVER`) |
| Text | Primary `text-zinc-100`, secondary `text-zinc-400`, labels `text-zinc-500`. No stark white or black |
| Primary buttons | Gradient `from-emerald-500 to-cyan-500`, `text-zinc-950`, emerald glow shadow (`BTN_PRIMARY`) |
| Secondary buttons | `bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-200 border border-white/10` (`BTN_SECONDARY`) |
| Scrollbars | Every scrollable container uses the glass scrollbar string (`SCROLLBAR`) |
| Mobile | 44px minimum touch targets (`min-h-11`); desktop modals become bottom sheets below `md` (`MODAL_BACKDROP` + `MODAL_SHEET`); horizontal tab lists and Kanban columns scroll with edge fade masks (`H_SCROLL`, `KANBAN_ROW`) |
| Metadata / status | Micro-scaled, wide-tracked, uppercase monospaced labels |
| Accent color | Emerald and cyan. Pulsing emerald for live/system status |
| Avoid | Purple accents, warm cream looks, emoji clutter, sharp corners, stark `#000` / `#fff` surfaces on screen |

Print output (`@media print` in `globals.css`) stays black-on-white on purpose, since it targets paper.

Preserve the existing landing and dashboard layouts when extending UI.

## Target data model (for schema phases)

Guidance from the product blueprint. Implement via migrations/SQL in the schema phase—not as invented client-only state.

### Users / profiles

- User UUID (auth user id)
- First name, last name, username
- Account preferences
- Task associations (team-assigned + self tasks)

### Teams

- Team UUID
- Team name and number
- Captain / owner account UUID
- Members, member roles (name + permissions)
- Inventory (parts)
- Tasks (team board)

### Roles (per team)

- Name (e.g. Software, Hardware)
- Permissions (as defined by team admins / captains)

### Inventory / parts

- Part name
- Part type / SKU
- Status: `inventory` | `to_be_used` | `used` | `removed` (removed is inaccessible to new task assignment)
- Status changes from inventory UI and/or task linkage

### Tasks

- Name, description
- Assigned members and/or entire roles
- Used parts (linking a part may move status to `to_be_used` or `used` depending on task status)
- Importance / category (including custom categories)
- Competition status (as needed)
- Due date
- Subtasks: name, description, assigned members, used parts (from parent task parts), due date, importance

### Members (team membership)

- Associated account UUID
- Display names
- Assigned roles
- Assigned tasks

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `node tools/catalog-ingest/fetch.mjs <vendor>` | Offline catalog crawl (Node 20+ built-ins only; no npm package) |
| `node tools/catalog-ingest/emit.mjs` | Write `013_seed_official_catalog_NN.sql` parts from completed snapshots |

The catalog ingest tool lives under `tools/catalog-ingest/` and is not part of the Next.js bundle. It uses Node's global `fetch` and the standard library. It waits 10 seconds between vendor requests. Details are in that directory's README. AndyMark, West Coast Products, and Studica are follow-ups (roadmap phase 6.6), not part of this tool's current run.

## Deliberate exclusions

| Excluded | Why |
|----------|-----|
| Prisma / other ORMs (for now) | Keep stack minimal; Supabase client is enough until schema complexity forces otherwise |
| Native mobile | Deferred roadmap phase; web v1 only |
| Computer-vision model | After manual parts inventory ships |
| Committing secrets | Open-source safety |
| Inventing APIs without a feature spec | SDD workflow: requirements → plan → code |

## Agent constraints

1. Read `specs/mission.md`, this file, and `specs/roadmap.md` before feature work.
2. Follow `specs/SDD-PROMPT.md` for phase pickup and feature directories.
3. Do not add dependencies unless the feature requirements justify them and tech-stack is updated.
4. Match existing file/folder naming and dark aesthetic; do not redesign the product on a whim.
