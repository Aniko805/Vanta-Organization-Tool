# Requirements — Personal Task Board Refresh

## Phase

- Roadmap phase: Refinement of completed Phase 4 — Personal / individual tasks
- Feature directory: `specs/2026-09-27-personal-task-board/`

## Context

The current `/personal-tasks` page separates personal tasks and assigned team tasks into different lists and lacks the status-board and parent selector flow used by `/team-tasks`. The feature makes both task kinds scannable in one status-based view and lets a user create a personal task under either a personal task or an assigned team task.

## Scope

### In scope

- Mixed four-column task board for the user's personal tasks and assigned team tasks.
- Create personal task with name, description, importance, due date, status, and optional parent task.
- Parent task choices from the tasks already present in the personal-task feed.
- Drag/drop status updates, optimistic feedback with rollback on failure, and personal-only delete.
- Clear visual and text distinction for assigned team tasks.

### Out of scope

- Schema migrations, RLS policy changes, team-task creation/editing, or changing team-task permissions.
- Showing all team tasks beyond those already assigned to the current user.
- Changes to roadmap Phase 4 status or sidebar navigation.

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Board layout | Shared columns for both task kinds | Makes status comparable without separate sections |
| Team distinction | Alternate restrained card border/surface and explicit team/source label | Tasks remain in status order while their ownership is immediately recognizable |
| Parent choices | Personal tasks and assigned team tasks from the current feed | Supports cross-kind parent links without widening the current data-access scope |
| Parent relation | Use `tasks.parent_id`; do not conflate it with legacy `subtasks` rows | Existing team-task form uses `parent_id` for task-to-task relationships |
| Database access | Do not add RLS migrations; verify against deployed schema/policies manually | Exported migrations do not include the deployed RLS policies |

## Data shapes / contracts

### MUST

- Personal task inserts use `is_personal = true`, `team_id = null`, and an authenticated creator ID.
- Personal task ownership is determined by `created_by`; the personal feed filters by the current user's ID.
- Team-task inserts continue to require a team ID.
- The team task page must exclude rows with `team_id IS NULL` and rows with `is_personal = true`.
- A personal task may set `parent_id` to an available personal task or assigned team task.
- Task-list selects must not request the unavailable `tasks → subtasks` relationship unless that relationship is present in the deployed schema and consumed by the UI.
- The board uses `TASK_COLUMNS` and task status values `todo`, `in_progress`, `blocked`, and `done`.
- Status changes persist through `updateTask`; failures restore the original UI status.
- Delete is available only for tasks where `is_personal` is true.
- Configured deployed schema and RLS must permit the required reads/writes. Missing policy SQL in the migration export is not evidence that policies are absent.

### SHOULD

- Preserve existing personal and assigned-task feed semantics, including team name and number metadata.
- Retain loading, empty, and error feedback and the existing Vulcan dark design system.

## UX / routes

- Routes touched: `/personal-tasks`
- Sidebar changes: none
- Aesthetic: follow `specs/tech-stack.md`; use existing `AppShell`, `Panel`, `FieldInput`, and button components.

## Dependencies

- Depends on the deployed tasks schema allowing nullable `team_id` for personal tasks and `parent_id` across task kinds.
- Depends on deployed task policies allowing the current user to read listed tasks, create personal tasks, and update visible team-task status.
- No live Supabase database access is available to this coding session; deployed-schema/policy behavior requires manual verification.
