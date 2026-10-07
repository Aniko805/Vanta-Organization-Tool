# Validation — Dashboard Feature Widgets

## Definition of done

The dashboard presents five linked feature widgets with current task, member, and inventory previews, useful fallbacks, and the requested Part Identifier “Coming soon” state.

## Acceptance checks

- [x] The dashboard contains Personal Tasks, Team, Team Tasks, Parts, and Part Identifier widgets; prior log, focus, aggregate-stat, and sync UI is removed.
- [x] Personal tasks and first-team tasks exclude completed tasks, sort dated tasks earliest-first with undated tasks last, and show at most three.
- [x] Team members are displayed for the first team and use newest-first `joined_at` ordering only when dates are available.
- [x] Parts shows up to three recent part/status listings, with part creation time as fallback for parts without status rows.
- [x] Every widget links to its feature route; Team Tasks preserves the first-team context; Part Identifier says “Coming soon.”
- [x] No-team, empty, loading, and error states are legible.
- [x] No schema, RLS, or dependency changes are introduced.

## Manual test steps

1. Open `/dashboard` with personal tasks and first-team tasks containing overdue, upcoming, undated, and completed entries; confirm the first three eligible tasks are sorted by due date.
2. Open `/dashboard` with a first team containing members and inventory status rows; confirm member fallback behavior and newest listing display.
3. Follow each widget link; confirm Team Tasks opens with the selected team and Part Identifier opens with the “Coming soon” widget label on the dashboard.
4. Repeat with no teams, no tasks, and no inventory; confirm empty states and feature links remain available. Simulate a failed data load and confirm an actionable error/retry state.

## Automated checks

- [x] `npm run lint` passes
- [x] `npm run build` passes

## Sign-off

- [x] Feature requirements implemented; no silent scope creep
- [ ] Manual live-data validation complete
- [x] `plan.md` implementation and automated validation tasks complete
- [x] `specs/roadmap.md` phase status remains unchanged for this refinement
- [x] No secrets committed
