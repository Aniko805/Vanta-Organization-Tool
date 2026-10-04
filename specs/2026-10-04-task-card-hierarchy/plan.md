# Plan — Task Card Hierarchy and Team Options

## Task groups

### 1. Team-scoped assignment options

- [x] Load team members and assignable parts through authenticated, team-scoped helpers.
- [x] Use membership user IDs and related profiles for assignment options.
- [x] Distinguish loading errors from empty member/part lists.

### 2. Consistent task cards and hierarchy

- [x] Align core task information and card actions across Team Tasks and Personal Tasks.
- [x] Show clickable child-task links and retain team assignee/part details.
- [x] Keep existing status controls and drag/drop behavior working.

### 3. Parent-prefilled child creation

- [x] Open the correct board's creation form from Add Child.
- [x] Read and validate URL parameters and preselect the parent task.
- [x] Route team-assigned tasks to their team board and personal tasks to Personal Tasks.

### 4. Authorized subtree deletion

- [x] Add a transactional, fixed-search-path RPC for deleting a task and its descendants.
- [x] Enforce personal ownership or team owner/admin/`can_manage_tasks` authorization using the authenticated user.
- [x] Revoke direct task-table DELETE and grant RPC execution only to authenticated users.
- [x] Add safe delete controls, confirmations, and UI refresh/error handling.

### 5. Validation

- [ ] Run `npm run lint` and `npm run build`.
- [ ] Document/perform manual board and assignment-option checks.
- [ ] Validate migration authorization and subtree cleanup against a migrated Supabase project when available.

## Notes

- This is a focused enhancement to completed Phases 3 and 4; do not change roadmap phase status.
- Implement one task group at a time.
- Do not claim live database behavior was validated without applying the migration to a test Supabase project.
- VS Code diagnostics report no TypeScript errors in changed files. ESLint/build and live database validation remain pending because the shared shell is stuck in an interactive Git pager.