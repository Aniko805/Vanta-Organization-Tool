# Requirements — Task Card Hierarchy and Team Options

## Phase

- Roadmap phase: Phase 3 — Team tasks and Phase 4 — Personal tasks (focused enhancement)
- Feature directory: `specs/2026-10-04-task-card-hierarchy/`

## Context

Team and personal task cards currently expose different information and actions. The Team Tasks page also loads profiles and parts without using its resolved team, and does so in a Server Component through the shared browser Supabase client. This can leave assignment choices empty under authenticated RLS. Existing task rows already support parent links through `tasks.parent_id`.

## Scope

### In scope

- Consistent core task information and hierarchy navigation on Team Tasks and Personal Tasks.
- Add Child actions that open the correct board's new-task form with the parent preselected.
- Team-scoped loading of assignable members and inventory parts.
- Personal-task deletion and permission-checked team-task subtree deletion.

### Out of scope

- Replacing `tasks.parent_id` with the separate `subtasks` table.
- Editing tasks beyond existing status/drag behavior and the create form.
- Deleting assigned team tasks from Personal Tasks.
- Roadmap phase status changes or unrelated task/inventory redesign.

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Child representation | Normal task rows linked by `parent_id` | Matches the current parent dropdown and supports board cards. |
| Child links | Link child names to their task cards on the appropriate board | Provides direct navigation without introducing a separate detail route. |
| Team deletion | Owner/admin or a member with `can_manage_tasks` only | Matches the team's task-management permission model. |
| Personal board deletion | Personal tasks only | Assigned team tasks are shared work and remain protected there. |
| Parent deletion | Delete its complete descendant tree | Explicitly requested behavior; database operation is transactional. |
| Assignment options | Authenticated queries scoped to the active team | Prevents global profiles/parts and allows existing RLS to return visible rows. |

## Data shapes / contracts

### MUST

- Use `tasks.parent_id` for task hierarchy.
- Both boards show task name, description when present, status, importance, due date when present, and parent/child context.
- Team task cards show assigned members and linked parts when present.
- Child names navigate to the corresponding task card on its personal or team board.
- Add Child opens the correct creation form and preselects the source task as parent.
- Team member choices come from `team_members` for the active team and display related profiles; assignable parts come from `parts` for that team.
- Load failures are distinguishable from genuinely empty assignment lists.
- Personal Tasks does not offer deletion for assigned team tasks.
- Team deletion authorization is derived from `auth.uid()` and checked against task team membership, owner, admin, or `can_manage_tasks` role; it must not trust client-supplied identity/permission claims.
- Deleting a task removes all descendants and dependent association rows transactionally.
- Direct task-table DELETE cannot bypass the permission-checked deletion operation.

### SHOULD

- Keep card styling and core interactions consistent without changing the established dark design system.
- Keep existing status updates, drag/drop, and task creation behavior intact.
- Confirm destructive subtree deletion before invoking it.

## UX / routes

- Routes touched: `/team-tasks`, `/personal-tasks`
- Sidebar changes: none
- Aesthetic: follow `specs/tech-stack.md`

## Dependencies

- Depends on: existing `team_members`, `member_roles`, `team_roles`, `parts`, `tasks`, and task association tables.
- Database acceptance checks require applying the additive task deletion migration to the Supabase project.
- The live Supabase project is not accessible from this workspace; its effective privileges/policies must be validated after migration.