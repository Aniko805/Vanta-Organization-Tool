# Plan — Personal Task Board Refresh

## Task groups

### 1. Task creation contract

- [x] Allow `createTask` to insert a personal task with `team_id: null` while preserving the team ID requirement for team tasks.
- [x] Persist `parent_id`, scope personal rows by `created_by`, and preserve the combined personal-plus-assigned listing contract.

### 2. Personal tasks board

- [x] Replace separate task sections with four shared status columns and a collapsible personal-task form.
- [x] Add optional parent selection across personal and assigned team tasks and show parent/source labels on cards.
- [x] Add optimistic drag/drop status updates with rollback and keep deletion personal-only.

### 3. Verification

- [x] Run focused lint and production build.
- [x] Remove the unused `subtasks(*)` relation from task-list selects and filter team task initial loading to non-null `team_id` and `is_personal = false`.
- [ ] Record manual verification requirements for deployed Supabase schema and policies; do not infer RLS state from migration exports.
- [x] Update this plan and validation checklist with completed checks; leave roadmap Phase 4 status unchanged.

## Notes

- Implement one task group at a time.
- No schema or RLS migration is in scope.
- Assigned team task parent options are limited to those returned by `listPersonalAndAssignedTasks`.
- Full `npm run lint` still reports existing errors in `src/app/next-steps-after-signup/page.tsx` and `src/app/team/page.tsx`; focused lint on changed source files passes.
