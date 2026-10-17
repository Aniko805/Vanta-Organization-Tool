# Official parts catalog ingest

Offline tool that snapshots goBILDA and REV Robotics product pages and emits an idempotent SQL seed. The Next.js app does not import this directory. Nothing here talks to Supabase, and no service-role key is read or written.

Runtime: Node.js 20+ (global `fetch`, `node:test`). No npm install and no packages beyond the Node standard library.

## What it collects

Both vendors are BigCommerce stores.

1. Product URLs come from `/xmlsitemap.php?type=products&page=N`.
2. Each product page is fetched at least 10 seconds after the previous response. The client sends `VulcanCatalogIngest/1.0`, which identifies this tool and states the crawl delay. That matches the `Crawl-delay: 10` these stores publish for automated clients.
3. Purchasable SKUs are read from the page. goBILDA family pages list every pack or option as a child SKU (`data-sku` on `childProductOption`). The `parent-…` placeholder is not a catalog row. REV pages publish one SKU in the page data; it matches the URL slug (`/rev-41-1301/` → `REV-41-1301`).
4. Descriptions are plain text, truncated to 500 characters. Price is stored only in the JSON snapshot.
5. Kits and bundles are kept in the snapshot but omitted from the SQL seed. A 25-pack of one part is still seeded. A product filed only under a shared "Kits & Bundles" category is still seeded when its own name is not a kit or bundle.

AndyMark, West Coast Products, and Studica are not fetched. See `vendors.mjs` and roadmap phase 6.6.

## Commands

From the repository root:

```bash
node tools/catalog-ingest/fetch.mjs gobilda
node tools/catalog-ingest/fetch.mjs rev
node tools/catalog-ingest/emit.mjs
node --test tools/catalog-ingest/*.test.mjs
```

`fetch.mjs` writes `data/<vendor>.json`. Re-running it resumes: stored pages are kept, failed URLs are retried, and the file is rewritten in URL order so the diff is reviewable. A snapshot is `complete` only when every current sitemap URL was stored or explicitly skipped.

goBILDA is about 2,400 product pages. At a 10 second delay that crawl takes roughly 7 hours. REV is a few hundred pages, roughly an hour. Leave the process running; start the same command again to continue after an interruption.

`emit.mjs` refuses to write a seed until both snapshots are complete. It replaces any `013_seed_official_catalog*.sql` files with several smaller parts, `013_seed_official_catalog_01.sql` onward, each small enough to paste into the Supabase SQL editor. `emit-when-complete.mjs` waits until both snapshots are complete and then runs `emit.mjs`. Apply `012_part_catalog_identity.sql` first (it is a single statement), then the `013` parts in filename order. Running a part twice does not create duplicate rows (`on conflict do nothing` on the official `(manufacturer, sku)` index).

`--limit N` fetches N new pages and leaves the snapshot incomplete. Use it to check the parser. Do not emit a seed from a limited run.

## Apply

Run the SQL in the Supabase SQL editor, or with the Supabase CLI against the linked project:

```bash
supabase db push
```

The seed is plain SQL. It does not use a privileged API key.
