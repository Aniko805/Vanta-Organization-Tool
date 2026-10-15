# Requirements — Official parts catalog & searchable picker

## Phase

- Roadmap phase: **Phase 6.5 — Official parts catalog** (inserted after Phase 6; prerequisite for Phase 7)
- Feature directory: `specs/2026-10-14-official-parts-catalog/`

## Context

Vulcan ships an official parts catalog (`part_catalog` rows with `team_id is null and is_official = true`) so teams do not have to hand-type every part. Today that catalog is empty and cannot realistically be filled, for three independent reasons:

1. **The catalog picker does not scale.** `listPartCatalog` issues an unbounded `.select("*")` (`src/lib/parts.ts`), and `/parts` renders every returned row into a single `<select>` (`src/app/parts/page.tsx`). Supabase's hosted PostgREST defaults to `max-rows = 1000`, so once the catalog exceeds 1000 rows the dropdown silently truncates and parts become unreachable. The full catalog is also re-sent to every browser on every `/parts` load, which is hostile to the Supabase free-tier egress budget (`mission.md` principle 2).
2. **The official catalog has no writable path.** The RLS policy `part_catalog_insert_inventory_managers` (`supabase/migrations/003_parts_inventory_rls.sql`) requires `team_id is not null`, so `authenticated`/`anon` clients are structurally forbidden from inserting official rows. Only `service_role` or direct SQL can write them.
3. **Catalog identity is unstable.** The official unique index is `(name, sku, description)` (`supabase/migrations/004_parts_catalog_aggregation.sql`). Vendor names and descriptions change between catalog revisions, so a re-import would create duplicates instead of updating rows. The vendor SKU is the stable identity key.

This phase makes the catalog **fillable** (identity + ingest path) and **usable** (searchable picker). It is ordered so the picker work lands first and is independently valuable: it also fixes the picker for teams with large *team* catalogs, before any official data exists.

`mission.md` lists "Parts inventory — Manual add/search" in scope and defers computer-vision identification to Phase 7. A clean catalog with SKUs, names, and image URLs is a direct enabler of Phase 7 (matching a photographed part against known parts is materially easier than matching free text).

## Scope

### In scope

- A searchable catalog picker on `/parts`: search **by part name**, browse all available catalog entries via paging, and select one when adding a part to inventory.
- Server-side catalog query helpers (bounded, paged, counted) replacing the unbounded list load.
- Catalog identity hardening: treat `(manufacturer, sku)` as the stable key for official rows.
- Catalog metadata columns needed by an imported catalog (`product_url`, `image_url`, `category`, `source`).
- An **offline** ingestion tool that captures vendor product data into a committed JSON snapshot and generates an idempotent SQL seed migration.
- Seeding the official catalog with goBILDA as the first vendor.

### Out of scope

- Runtime/on-demand scraping. The app must never crawl a vendor at request time.
- Computer-vision part identification (Phase 7).
- Live price display or price-driven features. Price may be captured in the snapshot but is **not** rendered in v1; it goes stale and creates a support burden.
- Rehosting vendor images. Store the CDN URL; do not copy binaries into storage.
- Vendors beyond goBILDA + REV in the first pass. AndyMark/WCP/Studica are documented follow-ups in `plan.md`, not committed deliverables.
- Any change to team-scoped catalog behaviour or inventory statuses.

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Load path for official rows | **Seed SQL migration**, not an API script with a service key | The official catalog is fixed curated data that ships with the app. A migration is reviewable, idempotent, needs no secret, and reaches every contributor who clones the repo. `service_role` must never enter the repo (`mission.md` principle 1). |
| Picker data source | Server-side query per search term | Removes the 1000-row ceiling and the whole-catalog egress cost. |
| Picker default state | Lists catalog entries on open, paged, **without requiring a query** | A team adding a part may not know what to search for; browsing must remain possible. Search is an accelerator, not a gate. |
| Search field | Part **name** only (case-insensitive substring) | Explicitly requested. SKU search is a SHOULD follow-up, not v1 — it complicates the PostgREST `or` filter for little early value. |
| Catalog identity | Partial unique index on `(manufacturer, sku)` where official and `sku is not null` | Vendor SKUs are stable across revisions; names/descriptions are not. The `sku is not null` guard is required because real vendor data contains null SKUs (verified on West Coast Products). |
| Images | Store `image_url` as a vendor CDN link | Avoids free-tier storage cost and image licensing/refresh burden. |
| Ingestion runtime | Offline tool under `tools/`, output committed to the repo | Keeps scraping dependencies out of the app bundle; `tech-stack.md` requires an explicit note for anything new. |

## Data shapes / contracts

### Catalog scope rule (unchanged, restated)

A team may select a catalog entry when `team_id = <team>` **or** (`team_id is null` and `is_official`). This is exactly the existing `part_catalog_select_team_or_official` policy and must not change.

### MUST

- `searchPartCatalog` MUST accept `{ teamId, query?, page, pageSize }` and return both a bounded page of rows and a total count.
- Every catalog read for the picker MUST be bounded. No unbounded `.select("*")` on `part_catalog` may remain on the `/parts` path.
- The picker MUST search by part name, case-insensitively, as a substring match.
- The picker MUST allow reaching **every** available catalog entry (empty query + paging to the end), not only entries matching a query.
- The picker MUST offer "create a new catalog item" and fall back to manual name/SKU/description entry.
- A new migration MUST add a partial unique index on `(manufacturer, sku)` for official rows with non-null SKUs.
- Existing official rows (if any) MUST be deduplicated by `(manufacturer, sku)` before that index is created.
- The ingestion tool MUST NOT write to Supabase with a privileged key from inside the repo.
- The generated seed MUST be idempotent: applying it twice MUST NOT create duplicate rows.

### SHOULD

- The picker SHOULD show which scope a result belongs to (official vs team) and display the SKU alongside the name.
- The picker SHOULD be keyboard operable (open, move, select, dismiss) and expose `role="listbox"`/`option` with `aria-activedescendant`.
- The picker SHOULD debounce queries to avoid a request per keystroke.
- `image_url` and `product_url` SHOULD be populated for imported rows so they are useful later (Phase 7, and reordering).
- Search SHOULD also match SKU in a later revision.

### MAY

- Capture `price` and `last_synced_at` in the JSON snapshot without exposing them in the UI.
- Add a per-vendor `source` value (e.g. `gobilda`) to support future re-imports and filtering.

## UX / routes

- Routes touched: `/parts` only. No new routes.
- Sidebar changes: none.
- Aesthetic: follow `specs/tech-stack.md`. The picker is a dark-glass popover over the existing `Panel` grid; monospaced micro-labels for metadata (SKU, scope, counts); no new accent colours.
- Picker states that must be visually distinct: closed-with-selection, open-empty-query (full list), open-with-results, open-with-no-results, loading, and error.

## Dependencies

- Depends on: Phase 6 (parts inventory) — complete. Existing `part_catalog` table and `add_part_to_inventory` RPC are reused unchanged.
- Blocked by: nothing. The picker task groups (1–2) are independent of the schema and ingestion groups (3–4) and ship first.
- Vendor research: see `plan.md` §4 for verified endpoints, SKU formats, and robots.txt constraints per manufacturer.

## Sources consulted for vendor research

- goBILDA / REV Robotics / ServoCity: BigCommerce. `/sitemap.xml` 404s; the real index is `/xmlsitemap.php?type=products`. SKU is rendered as visible body text.
- AndyMark / West Coast Products: Shopify. `GET /products.json?limit=N&page=N` returns full catalog JSON. Both advertise `agents.md` and UCP/MCP endpoints and ask agents to prefer those.
- Studica: nopCommerce, flat sitemap, no confirmed SKU scheme — open spike.
- robots.txt on the BigCommerce vendors requests `Crawl-delay: 10` for identified AI crawlers (GPTBot, ClaudeBot, CCBot, Scrapy, …). No product or sitemap path is disallowed. Ingestion must throttle and identify.
