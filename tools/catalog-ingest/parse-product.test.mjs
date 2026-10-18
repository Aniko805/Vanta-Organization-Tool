import assert from "node:assert/strict";
import test from "node:test";
import { parseProduct } from "./parse-product.mjs";

const gobilda = `<!doctype html>
<html><head>
<meta property="og:title" content="2801 Series Zinc Plated Steel Washer (4mm ID x 8mm OD)" />
<meta property="og:image" content="https://cdn.example/washer.jpg?c=1" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
  {"@type":"ListItem","position":1,"item":{"name":"Home"}},
  {"@type":"ListItem","position":2,"item":{"name":"HARDWARE"}},
  {"@type":"ListItem","position":3,"item":{"name":"Washers"}},
  {"@type":"ListItem","position":4,"item":{"name":"2801 Series Zinc Plated Steel Washer (4mm ID x 8mm OD)"}}
]}
</script>
<script>var BCData = {"product_attributes":{"sku":"parent-2801-0004-0008","price":{"without_tax":{"value":1.99}}}};</script>
</head><body>
<h1 class="productView-title">2801 Series Zinc Plated Steel Washer (4mm ID x 8mm OD)</h1>
<div class="product-description"><p>Flat washers act to increase the &ldquo;surface&rdquo; area of a goBILDA&reg; part.</p><div>Nested note.</div></div>
<div class="card-body child">
  <input data-pid="487" data-sku="2801-0004-0008" type="radio" class="childProductOption">
  <h4 class="card-title">25 Pack</h4>
  <span class="price price--withoutTax">$1.99</span>
</div>
<div class="card-body child">
  <input data-sku="2801-0004-0008" class="childProductOption" type="radio">
  <h4 class="card-title">25 Pack</h4>
</div>
<div class="card-body child">
  <input class="childProductOption" data-sku="2801-0004-0008-250pk" type="radio">
  <h4 class="card-title">250 Pack</h4>
  <span class="price price--withoutTax">$9.99</span>
</div>
<a data-sku="2809-0004-0007" class="card">related</a>
</body></html>`;

const rev = `<!doctype html>
<html><head>
<meta property="og:image" content="https://cdn.example/motor.jpg" />
<script type="application/ld+json">
{"@type":"BreadcrumbList","itemListElement":[
  {"item":{"name":"Home"}},
  {"item":{"name":"Shop All"}},
  {"item":{"name":"Motors"}},
  {"item":{"name":"HD Hex Motor"}}
]}
</script>
<script>var BCData = {"product_attributes":{"sku":"REV-41-1301","price":{"without_tax":{"value":29.33}}}};</script>
</head><body>
<h1 class="productView-title">HD Hex Motor 40:1 Spur Gearbox</h1>
<dd class="productView-info-value--sku" data-product-sku>REV-41-1301</dd>
<article class="productView-description">
  <div class="productView-description-tabContent is-open">
    <div><span>The HD Hex series motors plug right in.</span></div>
  </div>
</article>
</body></html>`;

test("goBILDA family page keeps child SKUs and drops the parent placeholder", () => {
  const product = parseProduct(gobilda, "https://www.gobilda.com/2801-series-zinc-plated-steel-washer-4mm-id-x-8mm-od/");
  assert.equal(product.name, "2801 Series Zinc Plated Steel Washer (4mm ID x 8mm OD)");
  assert.equal(product.category, "HARDWARE / Washers");
  assert.equal(product.description, 'Flat washers act to increase the "surface" area of a goBILDA® part. Nested note.');
  assert.equal(product.image_url, "https://cdn.example/washer.jpg?c=1");
  assert.equal(product.page_sku, "parent-2801-0004-0008");
  assert.deepEqual(product.variants.map((variant) => variant.sku), [
    "2801-0004-0008",
    "2801-0004-0008-250pk",
  ]);
  assert.equal(product.variants[0].label, "25 Pack");
  assert.equal(product.variants[0].price, "1.99");
  assert.equal(product.variants[1].price, "9.99");
});

test("REV option labels carry the purchasable SKU", () => {
  const html = `<!doctype html><html><body>
<h1 class="productView-title">#10-32 Socket Head Screws</h1>
<label data-product-attribute-value="1865" class="form-label">Socket Head Screws #10-32 x 1/4in - 50 Pack (REV-29-2910-PK50)</label>
<label data-product-attribute-value="1535" class="form-label">Socket Head Screws #10-32 x 5/16in - 50 Pack (REV-29-2911-PK50)</label>
<label data-product-attribute-value="1347" class="form-label">(REV-41-1347-PK4) 5mm x 75mm Hex Shaft - 4 Pack</label>
<label data-product-attribute-value="2599" class="form-label">Anderson Power Pole to XT30 Adapter - 2 Pack (REV-31-1385-PK20</label>
</body></html>`;
  const product = parseProduct(html, "https://www.revrobotics.com/10-32-Socket-Head-Screws/");
  assert.deepEqual(product.variants.map((variant) => variant.sku), [
    "REV-29-2910-PK50",
    "REV-29-2911-PK50",
    "REV-41-1347-PK4",
    "REV-31-1385-PK20",
  ]);
  assert.equal(product.variants[0].label, "Socket Head Screws #10-32 x 1/4in - 50 Pack");
  assert.equal(product.variants[2].label, "5mm x 75mm Hex Shaft - 4 Pack");
  assert.equal(product.variants[3].label, "Anderson Power Pole to XT30 Adapter - 2 Pack");
});

test("a description table can supply color SKUs when the option control has none", () => {
  const html = `<!doctype html><html><body>
<h1 class="productView-title">15mm Extrusion Slot Cover</h1>
<table><tr><td>COLOR</td><td>SKU</td></tr>
<tr><td>Red</td><td>REV-41-1633</td></tr>
<tr><td>White</td><td>REV-41-1634</td></tr></table>
</body></html>`;
  const product = parseProduct(html, "https://www.revrobotics.com/15mm-extrusion-slot-cover/");
  assert.deepEqual(product.variants.map((variant) => [variant.sku, variant.label]), [
    ["REV-41-1633", "Red"],
    ["REV-41-1634", "White"],
  ]);
});

test("REV page uses the body SKU, which matches the URL slug ignoring case", () => {
  const product = parseProduct(rev, "https://www.revrobotics.com/rev-41-1301/");
  assert.equal(product.name, "HD Hex Motor 40:1 Spur Gearbox");
  assert.equal(product.category, "Shop All / Motors");
  assert.equal(product.description, "The HD Hex series motors plug right in.");
  assert.equal(product.variants.length, 1);
  assert.equal(product.variants[0].sku, "REV-41-1301");
  assert.equal(product.variants[0].price, "29.33");
  assert.equal(product.sku_matches_slug, true);
});
