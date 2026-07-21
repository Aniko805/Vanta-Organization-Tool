# Vanta Organization Tool

Open-source organization software for **FRC / FTC** teams: parts inventory, team membership & roles, and Kanban-style team + personal tasks.

Hosted for free-tier **Vercel** + **Supabase**. Product constitution lives in [`specs/`](./specs/).

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Supabase Auth + Postgres (RLS)

## Setup

1. Clone and install:

```bash
npm install
```

2. Create a `.env.local` (never commit secrets):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Apply the database schema in the Supabase SQL Editor:

- Run [`supabase/migrations/001_vanta_schema.sql`](./supabase/migrations/001_vanta_schema.sql)

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## App routes

| Route | Purpose |
|-------|---------|
| `/` | Public homepage |
| `/login` | Sign in / sign up |
| `/setup-profile` | Name onboarding |
| `/dashboard` | Live workspace overview |
| `/team` | Create / join teams, members, invites |
| `/team-tasks` | Team Kanban board |
| `/personal-tasks` | Personal + assigned tasks |
| `/parts` | Team parts inventory |
| `/settings` | Profile settings |

## Spec Driven Development

Agents and contributors should read:

- [`specs/mission.md`](./specs/mission.md)
- [`specs/tech-stack.md`](./specs/tech-stack.md)
- [`specs/roadmap.md`](./specs/roadmap.md)
- [`specs/SDD-PROMPT.md`](./specs/SDD-PROMPT.md)

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
