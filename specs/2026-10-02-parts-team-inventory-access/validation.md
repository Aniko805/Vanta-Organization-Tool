# Validation — Team Inventory Access

## Definition of done

Team members can see shared inventory and its status options, while inventory writes remain limited to owners/admins/inventory-enabled roles.

## Acceptance checks

- [x] All inventory tables have RLS enabled and scoped policies in the migration.
- [ ] Team members can read their team's parts, catalog details, part statuses, and applicable status options.
- [ ] Users cannot read another team's private inventory/status options.
- [ ] Inventory writes require owner/admin/inventory role authorization.
- [x] Migration policies reject status IDs from other teams or non-default global statuses.
- [x] `/parts` explains missing status configuration and clears stale filters on team changes.

## Manual test steps

1. Apply the new migration to the Supabase project.
2. As two members of one team, confirm both can see the same parts, catalog details, status options, and filters.
3. Confirm a non-member cannot read that team's inventory or custom statuses.
4. Confirm an inventory manager can add/change/delete inventory and a read-only member cannot.
5. Confirm creating/changing a part stores a valid global-default or same-team `status_list.id`.

## Automated checks

- [x] `npx eslint src/app/parts/page.tsx src/lib/parts.ts` passes.
- [x] `npm run build` passes.

## Sign-off

- [ ] Feature requirements met; no unrelated RLS scope added.
- [ ] `plan.md` task groups complete.
- [ ] No secrets committed.
