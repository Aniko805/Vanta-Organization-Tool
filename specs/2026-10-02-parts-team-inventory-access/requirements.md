# Requirements — Team Inventory Access

## Phase

- Roadmap phase: Phase 6 — Parts inventory (focused repair)
- Feature directory: `specs/2026-10-02-parts-team-inventory-access/`

## Context

The active migrations define the current `parts`, `part_catalog`, `status_list`, and `part_status` model but do not configure RLS policies. The Parts page loads statuses and team inventory through these relations, so missing row visibility can empty the selectors and restrict inventory to its creator. The live Supabase project must receive the new migration for the behavior to change there.

## Scope

### In scope

- Add scoped RLS policies for team inventory, catalog rows, status rows, and global/team status options.
- Share read-only inventory with all members of the owning team.
- Restrict inventory mutations to team owners, admins, or members assigned a role with `can_manage_inventory`.
- Improve the Parts page status-empty and team-switch behavior.

### Out of scope

- RLS redesign for unrelated teams/tasks/profile tables.
- Changes to the deprecated schema migration.
- A new roadmap phase or change to Phase 6 completion.

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Inventory reads | All members of the team | Confirmed by the user; enables shared inventory visibility. |
| Inventory writes | Owner/admin/inventory-enabled roles | Matches existing Parts page permission checks. |
| Global statuses | Readable by authenticated users when `is_default = true` and `team_id IS NULL` | Needed as shared status options. |
| Team statuses | Readable by members of that team; assignable only to that team | Prevents cross-team access and status assignment. |

## Data shapes / contracts

### MUST

- RLS policies use the current `team_members` → `member_roles` → `team_roles` relationship.
- Authorization derives the actor from `auth.uid()` rather than client-supplied user IDs.
- `part_status.status_id` references a global default status or a status belonging to the same team as the related part.
- Global/team status rows and embedded catalog/status relations remain readable to authorized team members.
- The page displays actionable feedback when no status rows are visible and never writes text labels into UUID columns.

### SHOULD

- Use narrow SECURITY DEFINER helpers with a fixed `search_path` only where needed to avoid RLS recursion.
- Keep PostgreSQL table grants and RLS policies explicit and distinct.

## UX / routes

- Routes touched: `/parts`
- Sidebar changes: none
- Aesthetic: preserve existing Parts page styling.

## Dependencies

- Depends on: active migrations `001_initial_schema.sql` and `002_team_roles_via_member_roles.sql`
- Blocked by: migration must be applied to the Supabase project before live RLS behavior changes.
