/**
 * Extract a catalog product from a BigCommerce product page.
 * goBILDA family pages list every purchasable SKU as a child option.
 * REV pages expose one SKU in `BCData` and in the URL slug.
 */

import { DESCRIPTION_MAX } from "./vendors.mjs";

const NAMED_ENTITIES = {
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  ldquo: '"',
  rdquo: '"',
  lsquo: "'",
  rsquo: "'",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  reg: "®",
  trade: "™",
  copy: "©",
  deg: "°",
  times: "×",
  bull: "•",
  middot: "·",
  sup1: "¹",
  sup2: "²",
  sup3: "³",
  frac14: "¼",
  frac12: "½",
  frac34: "¾",
  plusmn: "±",
  omega: "Ω",
  micro: "µ",
};

const DESCRIPTION_CLASSES = [
  "product-description",
  "productView-description-tabContent",
];

export function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&([a-z][a-z0-9]*);/gi, (entity, name) => NAMED_ENTITIES[name.toLowerCase()] ?? entity)
    .replace(/&amp;/gi, "&");
}

function truncate(value, max) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.trimEnd()}…`;
}

export function cleanText(value) {
  return decodeEntities(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/(\()\s+/g, "$1")
    .trim();
}

export function htmlToText(fragment) {
  const stripped = fragment
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|h\d|div|tr)>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return cleanText(stripped);
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  if (!match) return null;
  return decodeEntities(match[2] ?? match[3] ?? "");
}

function nextTag(html, from, pattern) {
  const re = new RegExp(pattern, "gi");
  re.lastIndex = from;
  const match = re.exec(html);
  return match ? match.index : -1;
}

function innerByClass(html, className) {
  const re = new RegExp(
    `<div\\b[^>]*class\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`,
    "i",
  );
  const match = re.exec(html);
  if (!match) return null;
  let index = match.index + match[0].length;
  let depth = 1;
  const start = index;
  while (index < html.length && depth > 0) {
    const nextOpen = nextTag(html, index, "<div\\b");
    const nextClose = nextTag(html, index, "</div>");
    if (nextClose < 0) return html.slice(start);
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      index = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) return html.slice(start, nextClose);
      index = nextClose + 6;
    }
  }
  return html.slice(start);
}

export function extractBcData(html) {
  const marker = "var BCData = ";
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const jsonStart = start + marker.length;
  if (html[jsonStart] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function breadcrumbs(html) {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    try {
      const data = JSON.parse(script[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.["@type"] !== "BreadcrumbList" || !Array.isArray(item.itemListElement)) {
          continue;
        }
        return item.itemListElement
          .map((entry) => cleanText(String(entry?.item?.name ?? entry?.name ?? "")))
          .filter(Boolean);
      }
    } catch {
      // The next script may still be valid JSON-LD.
    }
  }
  return [];
}

function pageTitle(html) {
  const heading = html.match(/<h1\b[^>]*class\s*=\s*["'][^"']*productView-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (heading) return htmlToText(heading[1]);
  const og = html.match(/property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i)
    ?? html.match(/content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:title["']/i);
  return og ? cleanText(og[1]) : "";
}

function pageImage(html) {
  const og = html.match(/property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i)
    ?? html.match(/content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["']/i);
  return og ? cleanText(og[1]) : null;
}

function pageDescription(html) {
  for (const className of DESCRIPTION_CLASSES) {
    const inner = innerByClass(html, className);
    if (!inner) continue;
    const text = htmlToText(inner);
    if (text) return text;
  }
  return null;
}

function childVariants(html) {
  const variants = [];
  const inputs = html.matchAll(/<input\b[^>]*\bchildProductOption\b[^>]*>/gi);
  for (const input of inputs) {
    const sku = cleanText(attr(input[0], "data-sku") ?? "");
    if (!sku || sku.toLowerCase().startsWith("parent-")) continue;
    const window = html.slice(input.index, input.index + 2500);
    const labelMatch = window.match(/<h4\b[^>]*class\s*=\s*["'][^"']*card-title[^"']*["'][^>]*>([\s\S]*?)<\/h4>/i);
    const priceMatch = window.match(/class\s*=\s*["'][^"']*price--withoutTax[^"']*["'][^>]*>\s*\$?\s*([^<]+)/i);
    variants.push({
      sku,
      label: labelMatch ? htmlToText(labelMatch[1]) : "",
      price: priceMatch ? cleanText(priceMatch[1]).replace(/^\$/, "") : null,
    });
  }
  const seen = new Set();
  return variants.filter((variant) => {
    if (seen.has(variant.sku)) return false;
    seen.add(variant.sku);
    return true;
  });
}

function dedupeVariants(variants) {
  const seen = new Set();
  return variants.filter((variant) => {
    if (seen.has(variant.sku)) return false;
    seen.add(variant.sku);
    return true;
  });
}

function optionVariants(html) {
  const variants = [];
  const labels = html.matchAll(
    /<label\b[^>]*\bdata-product-attribute-value\s*=\s*["'][^"']+["'][^>]*>([\s\S]*?)<\/label>/gi,
  );
  for (const label of labels) {
    const text = htmlToText(label[1]);
    const leading = text.match(/^\(([A-Z0-9]+(?:-[A-Z0-9]+)+)\)?\s*(.+)$/i);
    const trailing = text.match(/^(.+?)\s*\(([A-Z0-9]+(?:-[A-Z0-9]+)+)\)?\s*$/i);
    const sku = leading?.[1] ?? trailing?.[2];
    const optionLabel = (leading?.[2] ?? trailing?.[1] ?? "").trim();
    if (!sku) continue;
    variants.push({
      sku,
      label: optionLabel,
      price: null,
    });
  }
  return dedupeVariants(variants);
}

function tableVariants(html) {
  const variants = [];
  const tables = html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi);
  for (const table of tables) {
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
      [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => htmlToText(cell[1])),
    );
    if (rows.length < 2) continue;
    const header = rows[0].map((cell) => cell.toLowerCase());
    const skuIndex = header.findIndex((cell) => cell === "sku");
    if (skuIndex < 0) continue;
    if (header.some((cell) => cell === "quantity" || cell === "qty" || cell === "product name")) continue;
    const labelIndex = header.findIndex((cell, index) => index !== skuIndex && cell);
    if (labelIndex < 0) continue;
    for (const row of rows.slice(1)) {
      const sku = (row[skuIndex] ?? "").trim();
      if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(sku)) continue;
      variants.push({
        sku,
        label: (row[labelIndex] ?? "").trim(),
        price: null,
      });
    }
  }
  return dedupeVariants(variants);
}

function simpleSku(html) {
  const bcSku = cleanText(String(extractBcData(html)?.product_attributes?.sku ?? ""));
  if (bcSku && !bcSku.toLowerCase().startsWith("parent-")) return bcSku;
  const visible = html.match(/data-product-sku(?:=["']([^"']+)["']|[^>]*>\s*([^<]+))/i);
  const sku = cleanText(visible?.[1] || visible?.[2] || "");
  if (!sku || sku.toLowerCase().startsWith("parent-")) return null;
  return sku;
}

function simplePrice(html) {
  const price = extractBcData(html)?.product_attributes?.price?.without_tax?.value;
  if (price == null || price === "") return null;
  return String(price);
}

export function urlSlug(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    return decodeURIComponent(path.split("/").pop() ?? "");
  } catch {
    return "";
  }
}

export function parseProduct(html, url) {
  const name = pageTitle(html);
  const crumbs = breadcrumbs(html);
  const categoryCrumbs = crumbs.slice(1, -1);
  const child = childVariants(html);
  const options = child.length > 0 ? child : optionVariants(html);
  const fromTable = options.length > 0 ? options : tableVariants(html);
  const pageSku = cleanText(String(extractBcData(html)?.product_attributes?.sku ?? ""));
  const resolved = fromTable.length > 0
    ? fromTable
    : (() => {
        const sku = simpleSku(html);
        return sku ? [{ sku, label: "", price: simplePrice(html) }] : [];
      })();
  const slug = urlSlug(url);
  return {
    url,
    name,
    category: categoryCrumbs.length > 0 ? categoryCrumbs.join(" / ") : null,
    description: (() => {
      const text = pageDescription(html);
      return text ? truncate(text, DESCRIPTION_MAX) : null;
    })(),
    image_url: pageImage(html),
    page_sku: pageSku || null,
    sku_matches_slug: resolved.some(
      (variant) => variant.sku.localeCompare(slug, undefined, { sensitivity: "accent" }) === 0,
    ),
    variants: resolved,
  };
}
