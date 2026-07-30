# Tech Stack

Source of truth for languages, libraries, conventions, design tokens, and deliberate exclusions. Agents MUST follow this file when implementing features.

## Runtime and framework

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | TypeScript 5 | Strict typing preferred for new code |
| Framework | Next.js 16.2.x | App Router under `src/app` |
| UI | React 19.2.x | Interactive pages use `"use client"` at the top of the component |
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
    settings/
    components/              # Shared UI (Sidebar, AppShell)
  lib/
    supabase.ts
    auth.ts
    types.ts
    teams.ts
    tasks.ts
    parts.ts
public/
supabase/migrations/         # Apply 001_vanta_schema.sql in Supabase
specs/                       # SDD constitution + feature specs
```

### Routing and pages

- Prefer App Router folders with `page.tsx` per route.
- Auth-gated tool routes redirect unauthenticated users to `/login` (pattern already used in `Sidebar`).
- Sidebar nav: Overview (`/dashboard`), Personal Tasks (`/personal-tasks`), Team (`/team`), Team Tasks (`/team-tasks`), Parts (`/parts`), Settings (`/settings`).

### Interactive vs server components

- Existing tool pages are largely client components (`"use client"`).
- Keep that pattern unless a phase explicitly introduces server components / Server Actions and documents why in the feature spec.

## Design system (Vanta aesthetic)

Vercel-inspired **premium developer dark mode**: high-contrast minimalism, geometric structure, dense data layouts.

| Token | Guidance |
|-------|----------|
| Page background | Absolute black `#000000` |
| Atmosphere | Procedural hairline gridlines (subtle, masked) |
| Surfaces | Semi-translucent dark zinc cards, e.g. `bg-zinc-950/40`, heavy backdrop blur |
| Borders | Dark glass / `border-zinc-900` family |
| Primary headers | Bold compressed sans; white-to-zinc gradient text mask where appropriate |
| Metadata / status | Micro-scaled, wide-tracked, uppercase monospaced labels |
| Primary actions | Solid white blocks; tactile `active:scale-95` |
| Secondary | Dark glass borders, low-chroma chrome |
| Accent color | Sharp neon points only—e.g. pulsing emerald for live/system status |
| Avoid | Purple-on-white themes, warm cream newspaper looks, emoji clutter, multi-layer shadow stacks, rounded-full pill spam |

Preserve existing landing and dashboard visual language when extending UI.

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
