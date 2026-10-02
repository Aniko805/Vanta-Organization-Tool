# Validation — Personal Task Board Refresh

## Definition of done

A user can see personal and assigned team tasks together by status, create personal tasks under either available task kind, and update statuses without losing the correct source distinction.

## Acceptance checks

- [x] Personal tasks and assigned team tasks appear in the correct shared status columns.
- [x] Team tasks have a distinct visual treatment and source/team label; personal tasks remain visually distinct.
- [x] Personal task queries scope by `created_by`; team task queries exclude personal and teamless rows.
- [x] Task-list selects no longer request the unavailable `subtasks` relationship.
- [ ] Create a root personal task and personal children of both personal and assigned team tasks; verify `parent_id` persists and the relationship is shown.
- [ ] Drag personal and team tasks to another status; successful changes persist and failed changes revert.
- [x] Delete is available only for personal tasks.
- [x] Loading, empty, and error states render appropriately.
- [ ] Verify the deployed database permits nullable `team_id` on personal tasks, cross-kind `parent_id`, and the required reads/writes under its configured policies. Do not treat absent exported RLS as absent deployed RLS.

## Manual test steps

1. Sign in and open `/personal-tasks` with personal tasks and at least one assigned team task available.
2. Create a root personal task, then create personal children of a personal task and an assigned team task; confirm board placement and parent labels.
3. Drag both task kinds across status columns, refresh the page to check persistence, and confirm only personal cards offer delete.
4. In the deployed Supabase project, confirm the schema and configured policies permit those reads/writes. Report any prerequisite; do not add RLS or schema migrations as part of this refinement.

## Automated checks

- [ ] `npm run lint` passes (currently blocked by existing unrelated errors in `next-steps-after-signup/page.tsx` and `team/page.tsx`).
- [x] `npx eslint src/app/personal-tasks/page.tsx src/lib/tasks.ts src/lib/types.ts` passes.
- [x] `npm run build` passes.

## Sign-off

- [ ] Feature requirements met; no scope expansion.
- [ ] `plan.md` task groups complete.
- [ ] Roadmap Phase 4 remains complete and unchanged.
- [ ] No secrets committed.
