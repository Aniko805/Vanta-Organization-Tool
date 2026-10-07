# Plan — Team Inventory Access

## Task groups

### 1. Database access policies

- [x] Add an additive migration after the current team-role migration.
- [x] Define secure membership and inventory-manager checks against the current role model.
- [x] Enable RLS and add scoped policies for `parts`, `part_catalog`, `part_status`, and `status_list`.
- [x] Enforce same-team/global-default status assignment.

### 2. Parts page states

- [x] Clear stale status options and status filters when the selected team changes.
- [x] Show an actionable empty-status message and disable status-dependent writes when no statuses are available.
- [x] Preserve UUID-backed status selector and filter behavior.

### 3. Validation

- [x] Review SQL authorization and policy predicates.
- [x] Run targeted ESLint and production build.
- [x] Document Supabase manual checks that require applying the migration.

## Notes

- Implement one task group at a time.
- The live Supabase database is not accessible from this workspace; manual policy verification requires applying the migration there.
- This is a focused repair to completed Phase 6; do not change roadmap phase status.
