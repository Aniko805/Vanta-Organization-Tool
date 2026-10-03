# Plan — Parts Catalog Selection and Aggregation

## Task groups

### 1. Database integrity and RPCs

- [x] Add indexes/constraints for catalog, team-part, and part-status uniqueness.
- [x] Consolidate duplicate catalog, team part, and part-status rows; preserve task links and sum quantities.
- [x] Add atomic RPCs for adding inventory and merging status changes with authorization checks.

### 2. Inventory helpers and form

- [x] Add catalog list and inventory-add helper functions.
- [x] Add catalog and status selectors to the add form.
- [x] Reuse selected catalog IDs; avoid creating a duplicate catalog row for matching metadata.

### 3. Validation

- [x] Run focused ESLint and production build.
- [x] Review migration backfill, uniqueness, authorization, and transaction behavior.
- [x] Document live Supabase validation steps.

## Notes

- Sum quantities on repeated add and on status merge.
- Match official catalog items and current-team items only, using trimmed name/SKU/description.
- Preserve `task_parts` references when old duplicate team part rows are consolidated.
- Live database testing requires applying the migration.
- `psql` and Supabase CLI are unavailable in the workspace, so SQL runtime validation remains pending.