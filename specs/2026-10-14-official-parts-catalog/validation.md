# Validation — Official parts catalog & searchable picker

> A phase is not done until these checks pass (or are explicitly waived by the human with a note).

## Definition of done

A team can add an official catalog part to inventory by searching for it by name (or browsing to it), the picker returns every matching entry regardless of catalog size, and the official catalog can be populated reproducibly without a privileged key in the repo.

## Acceptance checks

### Picker (task groups 1–2 — shippable on their own)

- [ ] No unbounded `part_catalog` read remains on the `/parts` path.
- [ ] Opening the picker with an empty query lists parts, and **Load more** pages until the catalog is exhausted.
- [ ] Typing filters by part name, case-insensitively, without a request per keystroke.
- [ ] A query matching nothing shows an explicit empty state, not a blank panel.
- [ ] Selecting a result shows name + SKU in the closed state and enables **Add to inventory**.
- [ ] "Create a new catalog item" still reveals the manual name/SKU/description fields and still creates a team-scoped catalog row.
- [ ] After a successful add, the picker resets and the new part appears in the inventory list.
- [ ] The picker is usable with the keyboard only (open → arrows → Enter → Escape).
- [ ] Team-scoped entries and official entries are both reachable and visually distinguishable.
- [ ] Switching teams clears the selection and does not leak the previous team's catalog entries.

### Catalog identity (task group 3)

- [ ] `012_part_catalog_identity.sql` applies cleanly to a database that already contains migrations `001`–`011`. (`011` is team delete cascade, so the identity migration is `012`.)
- [ ] Applying `012` twice does not error.
- [ ] The partial unique index on `(manufacturer, sku)` exists and does not constrain team-scoped rows.
- [ ] Official rows with a null SKU are permitted (the index must not block them).

### Ingestion (task groups 4–5)

- [ ] Each `013_seed_official_catalog_NN.sql` part is idempotent: applying it twice leaves the row count unchanged.
- [ ] The seed contains no kit or bundle rows (name, URL, or a kit category such as `KITS / Chassis Kits`). Same-part packs remain.
- [ ] No `service_role` key, `.env` value, or other secret appears anywhere in `tools/` or the generated migration.
- [ ] ≥ 20 sampled rows match the live vendor page on name, SKU, and product URL.
- [ ] Re-running the fetch produces a diffable change to the committed JSON snapshot rather than a silent overwrite.
- [ ] Ingestion respects the vendors' requested 10s crawl delay and sends an identifying User-Agent.

## Manual test steps

1. Sign in, open `/parts`, confirm a team is selected.
2. Open the catalog picker without typing. Confirm parts are listed and the count reads `Showing N of M`.
3. Click **Load more** repeatedly; confirm the list grows and eventually stops at M.
4. Type a partial part name (e.g. `hub`). Confirm the list narrows and only name matches appear.
5. Type a string that matches nothing. Confirm the empty state appears.
6. Select a result; confirm the closed picker shows the name and SKU.
7. Set a status and quantity, then click **Add to inventory**. Confirm the part is created with the catalog item's name and SKU.
8. Re-open the picker, choose **Create a new catalog item**, and add a manual part. Confirm it is created as a team part.
9. With the picker open, press `Escape`; confirm it closes and focus behaves.
10. Switch to a different team; confirm the picker resets and shows only that team's plus official entries.

### Scaling check (the regression this phase prevents)

- [ ] With > 1000 catalog rows present, confirm parts sorted after the first 1000 are still reachable by search and by paging.
- [ ] Confirm the `/parts` initial page load does **not** fetch the whole catalog (inspect the network tab; catalog requests should be page-sized, not table-sized).

## Automated checks (if applicable)

- [x] `npm run build` passes — verified 2026-10-14 on Next.js 16.2.10 (compilation + TypeScript clean)
- [x] No new runtime dependency added to `package.json` for the picker work
- [ ] `npm run lint` passes — **blocked by 2 pre-existing errors on files this change did not touch**: `src/app/dashboard/page.tsx:90` (`react-hooks/set-state-in-effect`) and `src/app/next-steps-after-signup/page.tsx:128` (`react/no-unescaped-entities`). `CatalogPicker.tsx` and `parts/page.tsx` contribute zero errors and zero warnings. Needs a human decision: fix the pre-existing errors, or waive this check.
- [x] `specs/tech-stack.md` updated for the ingestion tool (Node 20+ built-ins, no new npm dependency)

### Local query-shape verification (done)

The generated PostgREST request was inspected directly by building the query with `@supabase/supabase-js` and printing the URL (no network). Confirmed:

- The `or` logic tree survives intact: `or=(and(team_id.is.null,is_official.eq.true),team_id.eq.<uuid>)`.
- Paging produces `offset`/`limit`, and ordering produces `order=name.asc,id.asc` (total order → stable pages).
- `%` and `_` are backslash-escaped, so a literal `%` searches for `%`.
- A comma in the search text is percent-encoded to `%2C` and parentheses to `%28`/`%29`, so neither can be misread as PostgREST `or`/`and` separators.

Still to confirm against a live project (requires an authenticated session): that the comma case behaves as expected end to end in PostgREST's own parser.

## Sign-off

- [ ] Feature requirements met; no silent scope creep
- [ ] `plan.md` task groups complete
- [ ] `specs/roadmap.md` updated for this phase
- [ ] No secrets committed
