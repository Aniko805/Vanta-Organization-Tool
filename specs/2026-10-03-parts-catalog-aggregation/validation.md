# Validation — Parts Catalog Selection and Aggregation

## Definition of done

Inventory additions reuse catalog and team-part rows, aggregate quantities by status, expose catalog/status selection, show a separate listing per status, and delete dependent rows safely.

## Acceptance checks

- [x] Catalog dropdown includes global official and selected-team entries only.
- [x] Matching metadata reuses the existing catalog item.
- [x] Repeated add increments the existing part/status quantity.
- [x] Changing status into an existing status sums quantities and leaves one row.
- [ ] A part with multiple statuses appears once in each matching filter, with independent quantities.
- [ ] Deleting one listing removes only its status row; sibling status rows and quantities remain.
- [ ] Deleting the last listing removes its part and task-part references without a foreign-key error.
- [x] Existing task-part links remain valid after duplicate consolidation.
- [x] Database uniqueness and RPC authorization prevent concurrent duplicates and cross-team references.

## Manual test steps

1. Apply the migration to Supabase.
2. Add a new catalog item and inventory quantity; add it again with the same status and confirm one catalog, one part, and one status row with summed quantity.
3. Add the same part in a second status, then change it into an existing status and confirm quantities merge into one row.
4. Confirm catalog dropdown excludes other teams' private entries and includes official/current-team entries.
5. Confirm tasks linked to pre-migration duplicate parts still reference the consolidated part.
6. Delete one status listing from a part with multiple statuses and confirm its siblings remain unchanged.
7. Delete the last status listing for a part with task links; confirm the part and links are removed without a foreign-key error.

## Automated checks

- [x] `npx eslint src/app/parts/page.tsx src/lib/parts.ts` passes.
- [x] `npm run build` passes.

## Sign-off

- [ ] Feature requirements met; no unrelated scope added.
- [ ] `plan.md` task groups complete.
- [ ] No secrets committed.

## Pending live validation

- The migration has not been executed against Supabase because the workspace has neither the Supabase CLI nor `psql` configured.
- Apply migrations 004, 005, and 006 before verifying these acceptance checks against real team accounts and existing data.