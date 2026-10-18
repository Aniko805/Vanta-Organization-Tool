import assert from "node:assert/strict";
import test from "node:test";
import { numberOneWords, renderSeedSql, splitSeedParts, sqlLiteral } from "./emit.mjs";
import { normalizeSnapshot } from "./normalize.mjs";
import { CRAWL_DELAY_MS, USER_AGENT } from "./vendors.mjs";
import { extractLocs, parseFetchArgs } from "./fetch.mjs";

test("crawl delay stays at the robots.txt Crawl-delay and the user agent identifies the tool", () => {
  assert.equal(CRAWL_DELAY_MS, 10_000);
  assert.match(USER_AGENT, /VulcanCatalogIngest\/1\.0/);
  assert.match(USER_AGENT, /Crawl-delay 10/);
});

test("a full crawl omits --limit and still runs", () => {
  const parsed = parseFetchArgs(["gobilda"]);
  assert.equal(parsed.vendorId, "gobilda");
  assert.equal(parsed.limit, Infinity);
  assert.equal(parsed.error, null);
  assert.equal(parseFetchArgs(["rev", "--limit", "5"]).limit, 5);
  assert.match(parseFetchArgs(["gobilda", "--limit"]).error, /positive number/);
});

test("sitemap locs decode xml entities", () => {
  const xml = "<urlset><url><loc>https://www.gobilda.com/a&amp;b/</loc></url></urlset>";
  assert.deepEqual(extractLocs(xml), ["https://www.gobilda.com/a&b/"]);
});

test("normalize expands pack variants and truncates long descriptions", () => {
  const description = "word ".repeat(200);
  const rows = normalizeSnapshot({
    manufacturer: "goBILDA",
    source: "gobilda",
    products: [
      {
        url: "https://www.gobilda.com/washer/",
        name: "2801 Series Washer",
        category: "HARDWARE / Washers",
        description,
        image_url: "https://cdn.example/washer.jpg",
        variants: [
          { sku: "2801-0004-0008", label: "25 Pack", price: "1.99" },
          { sku: "2801-0004-0008-250pk", label: "250 Pack", price: "9.99" },
        ],
      },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].sku, "2801-0004-0008");
  assert.equal(rows[0].name, "2801 Series Washer — 25 Pack");
  assert.equal(rows[1].name, "2801 Series Washer — 250 Pack");
  assert.ok(rows[0].description.length <= 500);
  assert.equal(rows[0].description.endsWith("…"), true);
  assert.equal(rows[0].product_url, "https://www.gobilda.com/washer/?sku=2801-0004-0008");
  assert.equal(rows[0].price, "1.99");
});

test("kits and bundles are omitted and same-part packs stay", () => {
  const rows = normalizeSnapshot({
    manufacturer: "goBILDA",
    source: "gobilda",
    products: [
      {
        url: "https://www.gobilda.com/outlaw-chassis-kit/",
        name: "Outlaw Chassis Kit",
        category: "KITS / Chassis Kits",
        variants: [{ sku: "3209-0005-0001" }],
      },
      {
        url: "https://www.gobilda.com/ball-bearing-slide-pack/",
        name: "Ball Bearing Slide Pack",
        category: "KITS / Linear Motion Kits",
        variants: [{ sku: "3203-0001-0001" }],
      },
      {
        url: "https://www.gobilda.com/1118-series-open-gorail-bundle-12-pcs/",
        name: "1118 Series Open goRAIL Bundle (12 Pcs)",
        category: "KITS / Bundles / Structure Bundles",
        variants: [{ sku: "1101-0001-0001" }],
      },
      {
        url: "https://www.gobilda.com/washer/",
        name: "2801 Series Washer",
        category: "HARDWARE / Washers",
        description: "Included with the FTC starter kit.",
        variants: [{ sku: "2801-0004-0008", label: "25 Pack" }],
      },
      {
        url: "https://www.revrobotics.com/rev-41-1215/",
        name: "Storage Tote - Orange",
        category: "REV DUO / Kits & Bundles",
        variants: [{ sku: "REV-41-1215" }],
      },
      {
        url: "https://www.revrobotics.com/rev-45-1895/",
        name: "U Channel Bundle",
        category: "REV DUO / Kits & Bundles",
        variants: [{ sku: "REV-45-1895" }],
      },
    ],
  });
  assert.deepEqual(rows.map((row) => row.sku), ["2801-0004-0008", "REV-41-1215"]);
});

test("a longer option label becomes the catalog name", () => {
  const rows = normalizeSnapshot({
    manufacturer: "REV Robotics",
    source: "rev",
    products: [
      {
        url: "https://www.revrobotics.com/10-32-Socket-Head-Screws/",
        name: "#10-32 Socket Head Screws",
        variants: [
          { sku: "REV-29-2910-PK50", label: "Socket Head Screws #10-32 x 1/4in - 50 Pack", price: null },
          { sku: "REV-29-2911-PK50", label: "Socket Head Screws #10-32 x 5/16in - 50 Pack", price: null },
        ],
      },
    ],
  });
  assert.equal(rows[0].name, "Socket Head Screws #10-32 x 1/4in - 50 Pack");
  assert.equal(rows[0].product_url, "https://www.revrobotics.com/10-32-Socket-Head-Screws/?sku=REV-29-2910-PK50");
});

test("a single variant keeps the page name", () => {
  const rows = normalizeSnapshot({
    manufacturer: "REV Robotics",
    source: "rev",
    products: [
      {
        url: "https://www.revrobotics.com/rev-41-1301/",
        name: "HD Hex Motor",
        description: "Short.",
        variants: [{ sku: "REV-41-1301", label: "", price: "29.33" }],
      },
    ],
  });
  assert.equal(rows[0].name, "HD Hex Motor");
  assert.equal(rows[0].product_url, "https://www.revrobotics.com/rev-41-1301/");
  assert.equal(rows[0].description, "Short.");
});

test("seed sql is idempotent, escapes quotes, and contains no secrets", () => {
  assert.equal(sqlLiteral("it's"), "'it''s'");
  assert.equal(sqlLiteral(null), "null");
  assert.equal(sqlLiteral("I&sup2;C"), "'I²C'");
  assert.equal(
    sqlLiteral("off at <1400 microseconds, one off/one on at >1600"),
    "'off at less than 1400 microseconds, one off/one on at greater than 1600'",
  );
  assert.equal(
    numberOneWords("into one side, only One tool, someone"),
    "into one(1) side, only one(2) tool, someone",
  );
  const sql = renderSeedSql([
    {
      name: "Washer",
      sku: "2801-0004-0008",
      description: "it's a washer",
      manufacturer: "goBILDA",
      product_url: "https://www.gobilda.com/washer/",
      image_url: null,
      category: "Washers",
      source: "gobilda",
      price: "1.99",
    },
  ], { generatedAt: "2026-10-16T00:00:00.000Z" });
  assert.match(sql, /on conflict \(btrim\(manufacturer\), btrim\(sku\)\)/);
  assert.match(sql, /where team_id is null/);
  assert.match(sql, /and is_official/);
  assert.match(sql, /and sku is not null/);
  assert.match(sql, /do nothing;/);
  assert.match(sql, /'it''s a washer'/);
  assert.doesNotMatch(sql, /service_role/);
  assert.equal(sql.includes("1.99"), false);
});

test("seed parts stay small enough for the SQL editor", () => {
  const rows = Array.from({ length: 401 }, (_, index) => ({
    name: `Part ${index}`,
    sku: `SKU-${index}`,
    description: "short",
    manufacturer: "goBILDA",
    product_url: `https://www.gobilda.com/p/${index}/`,
    image_url: null,
    category: "Hardware",
    source: "gobilda",
  }));
  const parts = splitSeedParts(rows, { generatedAt: "2026-10-16T00:00:00.000Z", maxChars: 1 });
  const whole = renderSeedSql(rows, { generatedAt: "2026-10-16T00:00:00.000Z" });
  assert.equal(parts.length, 3);
  for (const part of parts) {
    assert.ok(part.sql.length < whole.length, part.name);
    assert.match(part.sql, /do nothing;/);
    assert.match(part.name, /^013_seed_official_catalog_\d{2}\.sql$/);
  }
});
