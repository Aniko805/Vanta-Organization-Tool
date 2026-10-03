# Requirements — Parts Catalog Selection and Aggregation

## Phase

- Roadmap phase: Phase 6 — Parts inventory (focused enhancement)
- Feature directory: `specs/2026-10-03-parts-catalog-aggregation/`

## Context

Adding a part currently creates a fresh catalog item, team inventory row, and status row each time. This fragments inventory and makes duplicate part/status combinations hard to manage.

## Scope

### In scope

- Reuse catalog entries based on trimmed name, SKU, and description within the current team or global official catalog.
- Offer catalog selection and status selection when adding an inventory item.
- Maintain one team inventory row per catalog item and one status row per part/status pair.
- Sum quantities when an existing matching status is added or when a status change targets an existing status row.
- Consolidate historical duplicate rows while preserving task links.

### Out of scope

- Reusing another team's private catalog entries.
- Catalog editing/merging workflows beyond duplicate reuse.
- Changes outside parts inventory and task-part references.

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Existing status quantity | Add quantities | Confirmed behavior; inventory quantities remain accurate. |
| Catalog match | Trimmed exact name, SKU, and description; global official or selected team only | Avoids cross-team private data reuse. |
| Catalog source | Dropdown of official and current-team items plus new-item entry | Supports reuse and manual additions. |

## Data shapes / contracts

### MUST

- Unique catalog identity is scoped to a team, with a separate uniqueness scope for global official rows.
- A team has at most one `parts` row per catalog ID.
- A part has at most one `part_status` row per status ID.
- Adding to an existing part/status atomically increments its quantity.
- Changing to an already-present status merges quantities and removes the duplicate row.
- Historical deduplication preserves `task_parts` associations and quantities.
- Inventory creation validates selected catalog/team/status IDs and the authenticated inventory-manager permission server-side.

## UX / routes

- Routes touched: `/parts`
- Sidebar changes: none
- Aesthetic: preserve the existing Parts page design.

## Dependencies

- Depends on: current `parts`, `part_catalog`, `part_status`, `status_list`, `task_parts` schema and inventory RLS migration.
- Blocked by: additive Supabase migration must be applied to the live database.