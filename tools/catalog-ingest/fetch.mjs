/**
 * Fetch vendor product pages into tools/catalog-ingest/data/<vendor>.json.
 *
 * Waits 10 seconds between HTTP requests and sends an identifying User-Agent.
 * Re-running resumes: pages already stored are not fetched again. Failed URLs
 * are retried. The snapshot is rewritten in stable order so a later crawl
 * diffs cleanly.
 *
 *   node tools/catalog-ingest/fetch.mjs gobilda
 *   node tools/catalog-ingest/fetch.mjs rev
 *   node tools/catalog-ingest/fetch.mjs gobilda --limit 5
 */
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseProduct } from "./parse-product.mjs";
import { CRAWL_DELAY_MS, USER_AGENT, activeVendors, followUpVendors } from "./vendors.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "data");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) =>
    decodeXml(match[1].trim()),
  );
}

function emptySnapshot(vendor) {
  return {
    vendor: vendor.id,
    manufacturer: vendor.manufacturer,
    source: vendor.source,
    origin: vendor.origin,
    crawl_delay_ms: CRAWL_DELAY_MS,
    user_agent: USER_AGENT,
    last_synced_at: null,
    complete: false,
    expected_urls: null,
    products: [],
    skipped: [],
    failures: [],
  };
}

async function readJson(file) {
  const parsed = JSON.parse(await readFile(file, "utf8"));
  return parsed;
}

async function loadSnapshot(file, vendor) {
  for (const candidate of [file, `${file}.tmp`]) {
    try {
      const parsed = await readJson(candidate);
      return {
        ...emptySnapshot(vendor),
        ...parsed,
        products: parsed.products ?? [],
        skipped: parsed.skipped ?? [],
        failures: parsed.failures ?? [],
      };
    } catch (error) {
      if (error.code === "ENOENT") continue;
      if (candidate === file) continue;
      throw error;
    }
  }
  return emptySnapshot(vendor);
}

const RETRYABLE_SKIP = "no purchasable sku";

function settledSkips(snapshot) {
  return snapshot.skipped.filter((item) => item.reason !== RETRYABLE_SKIP);
}

function isComplete(snapshot, urls) {
  if (snapshot.failures.length > 0) return false;
  const have = new Set([
    ...snapshot.products.map((product) => product.url),
    ...settledSkips(snapshot).map((item) => item.url),
  ]);
  return urls.every((url) => have.has(url));
}

async function writeSnapshot(file, snapshot) {
  snapshot.products.sort((a, b) => a.url.localeCompare(b.url));
  snapshot.skipped.sort((a, b) => a.url.localeCompare(b.url));
  snapshot.failures.sort((a, b) => a.url.localeCompare(b.url));
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await unlink(file).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  await rename(tmp, file);
}

function createFetcher() {
  let lastFinished = 0;
  return async function politeFetch(url) {
    if (lastFinished !== 0) {
      const elapsed = Date.now() - lastFinished;
      if (elapsed < CRAWL_DELAY_MS) await sleep(CRAWL_DELAY_MS - elapsed);
    }
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(45_000),
        });
        const text = response.status === 200 ? await response.text() : "";
        lastFinished = Date.now();
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`HTTP ${response.status}`);
          if (attempt < 3) {
            await sleep(CRAWL_DELAY_MS);
            continue;
          }
        }
        return { status: response.status, text };
      } catch (error) {
        lastFinished = Date.now();
        lastError = error;
        if (attempt < 3) await sleep(CRAWL_DELAY_MS);
      }
    }
    throw lastError ?? new Error(`Failed to fetch ${url}`);
  };
}

async function listProductUrls(vendor, politeFetch) {
  const urls = [];
  for (let page = 1; page <= 20; page += 1) {
    const target = `${vendor.sitemap}${page}`;
    process.stdout.write(`sitemap page ${page}\n`);
    const { status, text } = await politeFetch(target);
    if (status === 404 || status === 410) break;
    if (status !== 200) {
      throw new Error(`Sitemap ${target} returned HTTP ${status}`);
    }
    const locs = extractLocs(text).filter((loc) => loc.startsWith(vendor.origin));
    if (locs.length === 0) break;
    if (text.includes("<sitemapindex")) {
      for (const loc of locs) {
        if (!loc.includes("type=products")) continue;
        const nested = await politeFetch(loc);
        if (nested.status !== 200) {
          throw new Error(`Sitemap ${loc} returned HTTP ${nested.status}`);
        }
        urls.push(...extractLocs(nested.text).filter((item) => item.startsWith(vendor.origin)));
      }
      break;
    }
    urls.push(...locs);
  }
  return [...new Set(urls)];
}

function accountFor(snapshot, urls) {
  const have = new Set([
    ...snapshot.products.map((product) => product.url),
    ...settledSkips(snapshot).map((item) => item.url),
  ]);
  const pending = urls.filter((url) => !have.has(url));
  const failureUrls = new Set(snapshot.failures.map((item) => item.url));
  const retry = pending.filter((url) => failureUrls.has(url));
  const fresh = pending.filter((url) => !failureUrls.has(url));
  return [...fresh, ...retry];
}

export async function fetchVendor(vendorId, { limit = Infinity } = {}) {
  const vendor = activeVendors[vendorId];
  if (!vendor) {
    const follow = followUpVendors.map((item) => item.id).join(", ");
    throw new Error(
      `Unknown vendor "${vendorId}". Active: ${Object.keys(activeVendors).join(", ")}. Follow-ups not fetched here: ${follow}.`,
    );
  }
  await mkdir(dataDir, { recursive: true });
  const file = path.join(dataDir, `${vendor.id}.json`);
  const snapshot = await loadSnapshot(file, vendor);
  snapshot.crawl_delay_ms = CRAWL_DELAY_MS;
  snapshot.user_agent = USER_AGENT;
  const politeFetch = createFetcher();
  const urls = await listProductUrls(vendor, politeFetch);
  snapshot.expected_urls = urls.length;
  const urlSet = new Set(urls);
  snapshot.products = snapshot.products.filter((product) => urlSet.has(product.url));
  snapshot.skipped = snapshot.skipped.filter((item) => urlSet.has(item.url));

  const queue = accountFor(snapshot, urls).slice(0, limit);
  console.log(
    `${vendor.manufacturer}: ${urls.length} product urls, ${queue.length} to fetch, delay ${CRAWL_DELAY_MS}ms`,
  );

  let fetchedThisRun = 0;
  for (const url of queue) {
    fetchedThisRun += 1;
    process.stdout.write(`[${fetchedThisRun}/${queue.length}] ${url}\n`);
    try {
      const { status, text } = await politeFetch(url);
      const priorSkip = snapshot.skipped.find((item) => item.url === url);
      snapshot.failures = snapshot.failures.filter((item) => item.url !== url);
      snapshot.skipped = snapshot.skipped.filter((item) => item.url !== url);
      if (status === 404 || status === 410) {
        snapshot.skipped.push({ url, reason: `HTTP ${status}`, at: new Date().toISOString() });
      } else if (status !== 200) {
        snapshot.failures.push({
          url,
          error: `HTTP ${status}`,
          at: new Date().toISOString(),
        });
      } else {
        const parsed = parseProduct(text, url);
        if (!parsed.name || parsed.variants.length === 0) {
          const reason = !parsed.name
            ? "missing name"
            : priorSkip?.reason === RETRYABLE_SKIP
              ? "no purchasable sku confirmed"
              : RETRYABLE_SKIP;
          snapshot.skipped.push({ url, reason, at: new Date().toISOString() });
        } else {
          snapshot.products = snapshot.products.filter((product) => product.url !== url);
          snapshot.products.push({ ...parsed, fetched_at: new Date().toISOString() });
        }
      }
    } catch (error) {
      snapshot.failures = snapshot.failures.filter((item) => item.url !== url);
      snapshot.failures.push({
        url,
        error: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      });
    }
    snapshot.last_synced_at = new Date().toISOString();
    snapshot.complete = isComplete(snapshot, urls);
    await writeSnapshot(file, snapshot);
  }

  if (queue.length === 0) {
    snapshot.last_synced_at = new Date().toISOString();
    snapshot.complete = isComplete(snapshot, urls);
    await writeSnapshot(file, snapshot);
  }

  console.log(
    `${vendor.manufacturer}: products ${snapshot.products.length}, skipped ${snapshot.skipped.length}, failures ${snapshot.failures.length}, complete ${snapshot.complete}`,
  );
  return snapshot;
}

export function parseFetchArgs(argv) {
  const args = argv.filter((arg) => arg !== "--");
  const vendorId = args.find((arg) => !arg.startsWith("--")) ?? null;
  const limitFlag = args.indexOf("--limit");
  if (limitFlag < 0) return { vendorId, limit: Infinity, error: null };
  const limit = Number(args[limitFlag + 1]);
  if (!Number.isFinite(limit) || limit <= 0) {
    return { vendorId, limit, error: "--limit must be a positive number" };
  }
  return { vendorId, limit, error: null };
}

async function main() {
  const { vendorId, limit, error } = parseFetchArgs(process.argv.slice(2));
  if (!vendorId) {
    console.error("Usage: node tools/catalog-ingest/fetch.mjs <gobilda|rev> [--limit N]");
    process.exitCode = 1;
    return;
  }
  if (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }
  await fetchVendor(vendorId, { limit });
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
