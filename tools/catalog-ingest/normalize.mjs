import { DESCRIPTION_MAX, NAME_MAX } from "./vendors.mjs";

function truncate(value, max) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.trimEnd()}…`;
}

function variantName(pageName, label, variantCount) {
  if (!label) return pageName;
  if (label.length > pageName.length) return label;
  if (variantCount < 2) return pageName;
  if (pageName.toLowerCase().includes(label.toLowerCase())) return pageName;
  return `${pageName} — ${label}`;
}

function variantUrl(pageUrl, sku, variantCount) {
  if (variantCount < 2) return pageUrl;
  const url = new URL(pageUrl);
  url.searchParams.set("sku", sku);
  return url.toString();
}

const ASSORTMENT = /\b(kits?|bundles?)\b/i;

/**
 * Kits and bundles are assortments of other parts, so they are not catalog
 * rows. A same-part multipack ("25 Pack") does not match. A category such as
 * "Kits & Bundles" is not enough on its own: REV files unrelated products there.
 */
export function isKitProduct(product) {
  if (ASSORTMENT.test(product.name ?? "")) return true;
  if (ASSORTMENT.test(product.url ?? "")) return true;
  const segments = (product.category ?? "").split(/\s*\/\s*/);
  return segments.some((segment) => {
    if (/^(kits?|bundles?)$/i.test(segment)) return true;
    if (!ASSORTMENT.test(segment)) return false;
    return !/&|\band\b/i.test(segment);
  });
}

/**
 * Expand a vendor snapshot into official catalog rows.
 * Price stays out of the SQL row; callers that want it can read the snapshot.
 */
export function normalizeSnapshot(snapshot) {
  const rows = [];
  for (const product of snapshot.products ?? []) {
    if (isKitProduct(product)) continue;
    const pageName = (product.name ?? "").trim();
    if (!pageName) continue;
    const variants = product.variants ?? [];
    for (const variant of variants) {
      const sku = (variant.sku ?? "").trim();
      if (!sku || sku.toLowerCase().startsWith("parent-")) continue;
      const description = product.description
        ? truncate(product.description.trim(), DESCRIPTION_MAX)
        : null;
      rows.push({
        manufacturer: snapshot.manufacturer,
        sku,
        name: truncate(variantName(pageName, (variant.label ?? "").trim(), variants.length), NAME_MAX),
        description,
        category: product.category ?? null,
        product_url: variantUrl(product.url, sku, variants.length),
        image_url: product.image_url ?? null,
        source: snapshot.source,
        price: variant.price ?? null,
      });
    }
  }

  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.manufacturer}\u001f${row.sku}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }
  return [...byKey.values()].sort((a, b) => {
    const manufacturer = a.manufacturer.localeCompare(b.manufacturer);
    if (manufacturer !== 0) return manufacturer;
    return a.sku.localeCompare(b.sku);
  });
}

export function catalogRows(snapshots) {
  return snapshots
    .flatMap((snapshot) => normalizeSnapshot(snapshot))
    .sort((a, b) => {
      const manufacturer = a.manufacturer.localeCompare(b.manufacturer);
      if (manufacturer !== 0) return manufacturer;
      return a.sku.localeCompare(b.sku);
    });
}
