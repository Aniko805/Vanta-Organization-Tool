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

## Manual test steps

1. Sign in as a member of a team with multiple members and inventory parts; open Team Tasks and verify only that team's assignable members and parts appear.
2. Create a parent task and child task from both boards; verify the form opens with the parent selected and child links navigate to the right board/card.
3. Open Personal Tasks as a user assigned a team task; verify the shared task has no delete action and Add Child routes to that task's team board.
4. As a task manager, delete a parent with nested descendants and verify all descendant tasks and task associations are removed.
5. As a non-manager team member, attempt deletion through the UI and RPC; verify both are denied. Verify a user can delete their own personal task tree.
6. Move tasks between statuses and columns to verify existing status and drag/drop behavior remains intact.

## Automated checks

- [x] VS Code diagnostics report no TypeScript errors in changed files
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## Sign-off

- [ ] Feature requirements met; no silent scope creep
- [ ] `plan.md` task groups complete
- [ ] `specs/roadmap.md` phase status unchanged
- [ ] No secrets committed
- [ ] Live migration behavior validated on Supabase or explicitly recorded as pending