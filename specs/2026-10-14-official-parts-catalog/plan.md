# Plan — Official parts catalog & searchable picker

> Check boxes as task groups complete. Implement **one task group at a time**.

## Task groups

### 1. Catalog search query layer

- [x] Add `searchPartCatalog({ teamId, query, page, pageSize })` to `src/lib/parts.ts`, returning `{ items: PartCatalog[]; total: number }`.
- [x] Scope results to the existing rule in a single PostgREST `or`: `and(team_id.is.null,is_official.eq.true),team_id.eq.<teamId>`. Do not issue two chained `.or()` calls — the second overwrites the first.
- [x] Apply the name search with `.ilike("name", pattern)` and escape `%`, `_`, and `\` in user input so a literal `%` cannot widen the match.
- [x] Bound every request: `.range(offset, offset + pageSize - 1)` plus `{ count: "exact" }` for the total.
- [x] Order deterministically (`name`, then `id`) so paging is stable across requests.
- [x] Export a `CATALOG_PAGE_SIZE` constant and an `escapeLikePattern` helper.
- [x] Retire the unbounded `listPartCatalog` read from the `/parts` path (function removed; no remaining callers).

### 2. Searchable catalog picker UI

- [x] Add `src/app/components/CatalogPicker.tsx` (client component) matching the Vulcan dark aesthetic.
- [x] Closed state shows the current selection (name + SKU) or "Create a new catalog item".
- [x] Open state lists results **with an empty query** so browsing every part remains possible; search narrows the list.
- [x] Debounce the query (~200 ms) and guard against out-of-order responses with a request generation ref.
- [x] Group results by scope (Official parts / Team parts) and show the SKU on each row.
- [x] Show `Showing N of M` and a **Load more** control so the end of the catalog is reachable.
- [x] Distinct states: loading, empty result, and error (error must not clear the rest of the page).
- [x] Keyboard support: open, `ArrowUp`/`ArrowDown`, `Enter` to select, `Escape` to dismiss; `role="listbox"`/`role="option"` with `aria-activedescendant`.
- [x] Click-outside dismissal.
- [x] Replace the `<select>` in `src/app/parts/page.tsx`; drop the `catalog` array state and the `listPartCatalog` call from `refresh()` so the page no longer downloads the whole catalog.
- [x] Track the selected entry as an object (`selectedCatalog: PartCatalog | null`, `null` = create new) because the selection may not be present in the currently loaded page.
- [x] Preserve existing behaviour: manual name/SKU/description entry when creating a new catalog item, and reset of the picker after a successful add.
- [x] Reset the picker on team change via `key={teamId}` (remount) rather than a state-resetting effect, which `react-hooks/set-state-in-effect` rejects.

### 3. Catalog identity & schema migration

`011_team_delete_cascade.sql` already exists, so this migration is `012` and the seed is `013`.

- [x] Add `supabase/migrations/012_part_catalog_identity.sql`:
  - [x] Add `product_url`, `image_url`, `category`, `source` columns (all nullable).
  - [x] Backfill `manufacturer` for official rows where it is null and derivable.
  - [x] Deduplicate official rows by `(manufacturer, sku)` before indexing — repoint `parts.part_catalog_id` to the keeper row first, mirroring the pattern in `004_parts_catalog_aggregation.sql`.
  - [x] Create a partial unique index on `(manufacturer, sku)` where `team_id is null and is_official and sku is not null`.
  - [x] Leave the existing `(name, sku, description)` index in place initially; drop it only after a successful goBILDA import proves no regressions.
- [x] Update `PartCatalog` in `src/lib/types.ts` with the new columns.
- [x] Record the migration in `specs/roadmap.md` and the README migration list.

### 4. Offline ingestion tool + seed

- [x] Create `tools/catalog-ingest/` (offline; not imported by the app). Add a short `README.md` documenting how to re-run it.
- [ ] Fetch stage: write extracted vendor snapshots to `tools/catalog-ingest/data/<vendor>.json` (fields used by the catalog, not raw HTML — full HTML is hundreds of megabytes and is not a reviewable diff).
  - goBILDA: crawl `/xmlsitemap.php?type=products&page=N` for product URLs, then read purchasable SKUs from the product page. Family pages contribute every child `data-sku`; `parent-…` placeholders are not rows. Throttle to `Crawl-delay: 10` and set an identifying User-Agent.
  - REV: same shape. The page SKU matches the URL slug (`/rev-41-1301/` → `REV-41-1301`); the page SKU is the source of truth.
  - AndyMark / WCP / Studica: deferred to roadmap phase 6.6. Not fetched in this pass.
- [x] Normalize stage: map to the catalog shape (`manufacturer`, `sku`, `name`, `description`, `category`, `product_url`, `image_url`, `source`). Truncate long descriptions — they dominate payload size. Drop kits and bundles before the seed is emitted.
- [x] Emit stage: generate `supabase/migrations/013_seed_official_catalog_NN.sql` parts, each small enough for the SQL editor, idempotent via `on conflict do nothing` against the `(manufacturer, sku)` index.
- [ ] Commit the JSON snapshot so re-imports produce reviewable diffs.
- [x] Note the new tool and its runtime in `specs/tech-stack.md` (required by its own rules for anything new).

### 5. Seed + close-out

- [ ] Apply `012` and then `013_seed_official_catalog_01.sql` through `_14.sql` to the Supabase project (SQL Editor, one file at a time).
- [ ] Spot-check ≥ 20 imported rows against the live vendor pages for name, SKU, and URL accuracy.
- [ ] Verify a team can add an imported part to inventory end to end.
- [ ] Update `specs/roadmap.md`: tick deliverables and set the phase status.
- [x] If deferred, log AndyMark/WCP/Studica as a follow-up phase rather than leaving them implicit. Logged as roadmap phase 6.6.

## Notes

- **Groups 1–2 are independent of 3–5** and ship first by design. They fix the picker for large *team* catalogs and remove the 1000-row truncation risk before any official data exists.
- **Do not load the official catalog into the browser wholesale.** That is the specific regression this phase exists to prevent.
- The RLS blocker is real: the anon key cannot insert official rows, and `service_role` must not be committed. The seed-migration path is the only one that satisfies both.
- Respect vendor robots.txt: no product/sitemap path is disallowed, but the BigCommerce vendors request a 10s delay for AI crawlers. Ingest slowly and identify honestly; do not parallelise aggressively.
- Pagination is only stable if the sort is total. Always order by `(name, id)`, never `name` alone.
