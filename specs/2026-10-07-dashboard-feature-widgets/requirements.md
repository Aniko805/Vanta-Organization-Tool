# Requirements — Dashboard Feature Widgets

## Phase

- Roadmap phase: Refinement of completed Phase 5 — Dashboard widgets (real data)
- Feature directory: `specs/2026-10-07-dashboard-feature-widgets/`

## Context

The current dashboard emphasizes sync logs and aggregate counts, while the primary workflow is navigating into Vulcan's tools. This refinement replaces those elements with concise, live feature previews. It does not change the completed Phase 5 roadmap status or expand into the deferred Part Identifier implementation.

## Scope

### In scope

- Replace the system logs, active-focus panel, aggregate stat cards, and sync action with five feature widgets: Personal Tasks, Team, Team Tasks, Parts, and Part Identifier.
- Display up to three personal open tasks and up to three open tasks for the first team returned by `listMyTeams`, ordered by earliest due date.
- Display up to three first-team members, sorting newest-first when `joined_at` is available.
- Display up to three most recent first-team part/status listings.
- Provide a direct link from each widget to its feature route; show “Coming soon” in the Part Identifier widget.
- Preserve authenticated loading and useful empty/error states.

### Out of scope

- A Settings widget or changes to sidebar navigation.
- Database migrations, membership timestamp changes, or new data-access helpers unless implementation discovers existing helpers cannot serve the requirements.
- Aggregating task, member, or inventory content across multiple teams.
- Implementing computer-vision identification.
- Changing the roadmap Phase 5 completion status.

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Widget set | Exactly the five requested features | Matches the explicitly enumerated user scope; Settings is omitted. |
| Team scope | First team returned by `listMyTeams` | Matches the existing Team/Parts default and provides one coherent team context. |
| Task urgency | Earliest non-null due date first; undated tasks last; omit done tasks; cap at three | Makes date urgency predictable while retaining tasks with no due date. |
| Member recency | Use `joined_at` newest-first when available; otherwise preserve returned roster order | The active checked-in schema does not define a membership timestamp. |
| Parts recency | Flatten part-status rows and sort by `part_status.created_at`; use part creation time for parts without status rows | Displays recent inventory/status listings without treating quantity edits as new listings. |
| Identifier | Link to `/parts/identify` and label “Coming soon” | Provides the requested route without implying recognition is implemented. |

## Data shapes / contracts

### MUST

- Personal task preview uses `listPersonalAndAssignedTasks(user.id)`, includes only `is_personal` tasks whose status is not `done`, sorts by `due_date` ascending with missing dates last, and shows no more than three.
- Team task preview uses `listTeamTasks(firstTeam.id)`, excludes `done`, uses the same due-date ordering, and shows no more than three.
- Team and Parts previews use the same first team returned by `listMyTeams`.
- Team member names use the existing profile display-name helper. If available, `joined_at` controls newest-first ordering; missing values are not fabricated.
- Parts preview displays a part name, status name when present, and quantity when present. A part without status rows remains eligible using its own `created_at` timestamp.
- Each feature widget links directly to its feature page. The Team Tasks link includes the selected team ID when available.
- Loading, empty, and data-load error states remain understandable and do not claim unavailable data is current.
- No database schema or RLS changes are made.

### SHOULD

- Keep the dashboard responsive and use the existing `AppShell`, `Panel`, `Label`, `EmptyState`, and `ErrorText` patterns.
- Keep each widget compact and scannable, with a visible route link.

## UX / routes

- Routes touched: `/dashboard`
- Sidebar changes: none
- Aesthetic: follow `specs/tech-stack.md`; retain the existing Vulcan dark design system.

## Dependencies

- Depends on the existing task, team, and parts helpers and their configured Supabase access.
- The checked-in `team_members` schema does not contain `joined_at`; member date sorting is best-effort only.
- The identifier page exists, but computer-vision functionality remains deferred.
