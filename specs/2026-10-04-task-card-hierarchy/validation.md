# Validation — Task Card Hierarchy and Team Options

## Definition of done

Team and personal task cards expose consistent hierarchy actions, team assignment choices load for the active team, and task deletion respects ownership/manager permissions while deleting the selected task tree.

## Acceptance checks

- [ ] Team member and part options load only for the active team, with errors distinct from empty results.
- [ ] Both boards display the common task information and clickable child-task links; team cards retain assignee and part details.
- [ ] Add Child opens the correct board's new-task form with the selected task as parent.
- [ ] Personal-board team-assigned tasks cannot be deleted there.
- [ ] Owners/admins/`can_manage_tasks` members can delete team task trees; other members cannot.
- [ ] Personal task owners can delete their personal task trees.
- [ ] Parent deletion removes descendants and dependent task associations without leaving orphaned rows.
- [ ] Existing task status and drag/drop behavior remains available.
- [ ] Importance is visually distinct on both boards; overdue and due-today/tomorrow states are visibly urgent without obscuring importance.
- [ ] Team task creation supports importance, due date, and a `Task status` selector.
- [ ] Part selector shows current in-stock quantity, keeps zero-stock choices disabled, and validates requested positive quantities.
- [ ] Task creation reserves exactly the requested quantity from Inventory into Reserved, or In Use for initial `in_progress`; insufficient stock rolls back the task and all links.
- [ ] Moving a linked task into/out of `in_progress` transfers all allocations atomically and cannot make a status quantity negative.
- [ ] Deleting a task tree returns its allocations to Inventory.

## Manual test steps

1. Sign in as a member of a team with multiple members and inventory parts; open Team Tasks and verify only that team's assignable members and parts appear.
2. Create a parent task and child task from both boards; verify the form opens with the parent selected and child links navigate to the right board/card.
3. Open Personal Tasks as a user assigned a team task; verify the shared task has no delete action and Add Child routes to that task's team board.
4. As a task manager, delete a parent with nested descendants and verify all descendant tasks and task associations are removed.
5. As a non-manager team member, attempt deletion through the UI and RPC; verify both are denied. Verify a user can delete their own personal task tree.
6. Move tasks between statuses and columns to verify existing status and drag/drop behavior remains intact.
7. Create tasks with low/medium/high/critical importance and dates overdue, today, tomorrow, and later; verify distinct severity and deadline cues.
8. Reserve partial and full part quantities in todo and in-progress tasks; verify Inventory, Reserved, and In Use quantities and task allocations.
9. Move a task with allocated parts into and out of In Progress; verify inventory transfer. Attempt allocation beyond stock and verify the task is not created and inventory is unchanged.
10. Delete a task with allocated parts and verify the quantities return to Inventory.

## Automated checks

- [x] VS Code diagnostics report no TypeScript errors in changed files
- [x] Focused ESLint on changed TypeScript files passes
- [x] Production build passes
- [ ] `npm run lint` wrapper exit status captured
- [ ] Supabase migration lint/manual authorization and inventory-transfer checks pass

## Sign-off

- [ ] Feature requirements met; no silent scope creep
- [ ] `plan.md` task groups complete
- [ ] `specs/roadmap.md` phase status unchanged
- [ ] No secrets committed
- [ ] Live migration behavior validated on Supabase or explicitly recorded as pending

## Validation notes

- `next build` completed with exit code 0.
- Focused ESLint passed. Direct full-repository ESLint produced no diagnostics; the WSL shell returned only the npm banner for `npm run lint`, so its wrapper exit status was not captured.
- `supabase db lint --local` could not connect because Docker is unavailable and no local database is listening on port 54322.