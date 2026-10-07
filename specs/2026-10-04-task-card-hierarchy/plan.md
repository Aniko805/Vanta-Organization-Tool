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

### 5. Task urgency and team form

- [x] Color task cards by importance and separately highlight overdue/near-due tasks.
- [x] Add importance and due-date controls to team task creation.
- [x] Label the status selector `Task status`.

### 6. Quantity-aware part allocation

- [x] Add allocation quantity to `task_parts` and seed/normalize Inventory, Reserved, and In Use status rows.
- [x] Add an atomic team-task creation RPC that validates and reserves selected quantities.
- [x] Add an atomic team-task status RPC that transfers allocations between Reserved and In Use.
- [x] Return reserved/in-use allocations to Inventory when deleting task trees.
- [x] Show available stock and per-part quantity selectors; disable zero-stock parts.

### 7. Validation

- [x] Run focused ESLint and the production build.
- [ ] Document/perform manual board and assignment-option checks.
- [ ] Validate migration authorization and subtree cleanup against a migrated Supabase project when available.

## Notes

- This is a focused enhancement to completed Phases 3 and 4; do not change roadmap phase status.
- Implement one task group at a time.
- Do not claim live database behavior was validated without applying the migration to a test Supabase project.
- Production build passes. Focused ESLint passes; direct full-repository ESLint produced no diagnostics, though the npm wrapper did not return a captured exit status.
- Local Supabase lint is pending because Docker is unavailable; migration requires validation after applying it to a test database.
- VS Code diagnostics reported no TypeScript errors for the initial task hierarchy implementation. Run all checks again after the urgency/allocation changes.