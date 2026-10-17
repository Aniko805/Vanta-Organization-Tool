/**
 * Poll until both vendor snapshots are complete, then run emit.mjs.
 * Exits after 12 hours if a crawl is still unfinished.
 *
 *   node tools/catalog-ingest/emit-when-complete.mjs
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const files = ["gobilda", "rev"].map((id) => path.join(here, "data", `${id}.json`));
const deadline = Date.now() + 12 * 60 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readSnapshot(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

function needsSkuRetry(snapshot) {
  return (snapshot?.skipped ?? []).some((item) => item.reason === "no purchasable sku");
}

function runNode(script, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, script), ...args], { stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  while (Date.now() < deadline) {
    const snapshots = await Promise.all(files.map((file) => readSnapshot(file)));
    const ready = snapshots.map((snapshot) => snapshot?.complete === true);
    if (ready.every(Boolean)) {
      const retry = ["gobilda", "rev"].filter((id, index) => needsSkuRetry(snapshots[index]));
      if (retry.length === 0) {
        const code = await runNode("emit.mjs", []);
        process.exit(code);
      }
      for (const vendorId of retry) {
        console.log(`retrying pages with no SKU for ${vendorId}`);
        const code = await runNode("fetch.mjs", [vendorId]);
        if (code !== 0) process.exit(code);
      }
      continue;
    }
    const status = files
      .map((file, index) => `${path.basename(file)} ${ready[index] ? "ready" : "waiting"}`)
      .join(", ");
    console.log(status);
    await sleep(60_000);
  }
  console.error("Timed out waiting for complete catalog snapshots.");
  process.exitCode = 1;
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
