# Requirements — Vanta v1 core (Phases 1–6 + 8)

## Phase

- Roadmap phases: 1–6, 8 (CV Phase 7 and mobile Phase 9 deferred)
- Feature directory: `specs/2026-07-21-vanta-v1-core/`

## Context

Auth shell existed; teams, tasks, parts, and live dashboard were stubs. This delivery implements the schema + RLS and full UI for the web v1 product.

## Scope

### In scope

- Supabase SQL schema + RLS for teams, roles, members, parts, tasks, subtasks
- Invite-code join flow
- Team page, team Kanban, personal tasks, parts inventory, live dashboard
- README + homepage product copy
- Sidebar nav for new routes

### Out of scope

- Computer-vision parts ID (Phase 7)
- Native mobile (Phase 9)
- Email-based invites (codes only)

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Joins | Invite codes + RPC | Works on free tier without email provider |
| Team tasks route | `/team-tasks` | Keeps `/team` focused on membership |
| Parts route | `/parts` | Matches roadmap |
| Permissions | Role flags + owner | Captain/admin manage members/tasks/inventory |

## Data shapes / contracts

See `supabase/migrations/001_vanta_schema.sql` and `specs/tech-stack.md`.

### MUST

- Apply migration before using team/task/parts features
- Auth-gated tools redirect via Sidebar
- Removed parts cannot be selected for new task links (`listAssignableParts`)

### SHOULD

- Preserve Vanta dark aesthetic
- Keep secrets out of the repo
