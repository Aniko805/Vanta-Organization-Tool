# Requirements — Team Role Management

## Phase

- Roadmap phase: Refinement of completed Phase 2 — Teams and members
- Feature directory: `specs/2026-10-07-team-role-management/`

## Context

The `/team` page lists and assigns team roles, but users cannot manage role definitions or their permission flags. `team_roles` already stores `is_admin`, `can_manage_tasks`, `can_manage_members`, and `can_manage_inventory`. Role editing is security-sensitive because it can grant administrative capabilities, so authorization must be enforced by PostgreSQL rather than only by the client.

## Scope

### In scope

- Create, edit, and delete team-local role definitions from `/team`.
- Configure all four existing permission flags.
- Permit role-definition changes only to the team owner or a member assigned a role with `is_admin = true`.
- Expose authenticated, team-scoped role reads and route all browser writes through authorization-checked database RPCs.
- Delete member-role and task-role assignment links atomically with role deletion after explicit confirmation.
- Keep seeded roles editable/deletable and preserve owner-level authority independently of role assignments.

### Out of scope

- Changes to task permission semantics, task assignment UI, team membership administration, or default role seeding.
- Role transfer/reassignment during delete; deletion removes the old role's assignments instead.
- Changes to completed roadmap phase statuses or the next incomplete roadmap phase.

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Role-definition authorization | Owner or assigned `is_admin` role only | `can_manage_members` must not authorize privilege escalation by editing role flags. |
| Seeded roles | Editable and deletable like custom roles | Teams retain flexibility; the owner remains privileged even if Captain is changed or deleted. |
| Delete behavior | Transactionally clear `member_roles` and `task_role_assignees`, then delete role | Prevents foreign-key failures and stale assignments; the UI warns before this destructive action. |
| Write path | `SECURITY DEFINER` RPCs with identity from `auth.uid()` | Client-supplied team/user identity is not an authorization boundary. |
| Direct table writes | Revoke browser INSERT/UPDATE/DELETE on `team_roles`; grant authenticated SELECT under team-member/owner RLS | The role RPCs remain the only client write surface. |
| Names | Trim and reject empty names; reject case-insensitive duplicates within a team | Keeps definitions understandable and avoids ambiguous duplicate labels. |

## Data shapes / contracts

### MUST

- Role create/update writes accept `team_id`/`role_id`, a trimmed name, and the four boolean flags.
- The database derives the actor from `auth.uid()` and verifies team ownership or an assigned same-team role with `is_admin = true` on every mutation.
- Role IDs are validated against the requested team; a role cannot be moved between teams through update.
- Role names cannot be blank or duplicate another role name in the same team, ignoring surrounding whitespace and case.
- Authenticated members can select only roles for teams they belong to; team owners can read their team's roles.
- Authenticated and anonymous browser roles cannot directly insert, update, or delete `team_roles` rows.
- Delete removes member and task role links and the team role atomically; the RPC returns affected link counts for a clear success message.
- UI controls expose `is_admin`, `can_manage_tasks`, `can_manage_members`, and `can_manage_inventory`; no new permission fields are introduced.
- A user authorized by `can_manage_members` alone may retain existing member controls but cannot manage role definitions.

### SHOULD

- Role list, editor, busy, cancel, and error states be understandable and consistent with the existing team page.
- Role/member data refresh after mutations so permission badges and role selectors reflect updates immediately.

## UX / routes

- Routes touched: `/team`
- Sidebar changes: none
- Aesthetic: follow `specs/tech-stack.md` and preserve the existing dark team-page design.

## Dependencies

- Depends on the deployed `team_roles`, `team_members`, `member_roles`, and `task_role_assignees` tables described in the checked-in schema.
- Depends on the team membership helper from the current inventory RLS migration for scoped role reads.
- Live Supabase permissions and migration application must be verified; the workspace has no live database access.
