/**
 * Offline catalog vendors. The app never imports this module.
 *
 * Active vendors are BigCommerce storefronts. Product URLs come from
 * `/xmlsitemap.php?type=products&page=N`. Purchasable SKUs are read from
 * the product page (child options when the page is a family, otherwise
 * the page SKU). Parent placeholders such as `parent-2801-…` are not rows.
 *
 * AndyMark, West Coast Products, and Studica are documented follow-ups.
 * They are not fetched by this tool yet.
 */

export const CRAWL_DELAY_MS = 10_000;

export const USER_AGENT =
  "VulcanCatalogIngest/1.0 (educational FRC/FTC catalog; offline seed; Crawl-delay 10)";

export const DESCRIPTION_MAX = 500;
export const NAME_MAX = 240;

export const activeVendors = {
  gobilda: {
    id: "gobilda",
    manufacturer: "goBILDA",
    source: "gobilda",
    origin: "https://www.gobilda.com",
    sitemap: "https://www.gobilda.com/xmlsitemap.php?type=products&page=",
  },
  rev: {
    id: "rev",
    manufacturer: "REV Robotics",
    source: "rev",
    origin: "https://www.revrobotics.com",
    sitemap: "https://www.revrobotics.com/xmlsitemap.php?type=products&page=",
  },
};

export const followUpVendors = [
  {
    id: "andymark",
    manufacturer: "AndyMark",
    note: "Shopify. GET /products.json?limit=250&page=N. Prefer the advertised UCP/MCP endpoint if it is usable without credentials.",
  },
  {
    id: "wcp",
    manufacturer: "West Coast Products",
    note: "Shopify. GET /products.json?limit=250&page=N. Real data includes null SKUs; the official unique index ignores those.",
  },
  {
    id: "studica",
    manufacturer: "Studica",
    note: "nopCommerce. Flat sitemap, no confirmed SKU scheme. Unresolved spike.",
  },
];
