// SPDX-License-Identifier: AGPL-3.0-or-later
// Phase 24: download every file pinned in src/lib/detector/models.ts from the pinned HF tag
// and check it against PINNED_SHA256. Exits 1 on any mismatch.
//   node scripts/verify-model-pins.mjs [outDir]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(new URL("../src/lib/detector/models.ts", import.meta.url), "utf8");
const base = src.match(/PINNED_MODEL_BASE_URL\s*=\s*"([^"]+)"/)?.[1];
const labelsFile = src.match(/LABELS_FILE\s*=\s*"([^"]+)"/)?.[1];
const block = src.match(/PINNED_SHA256[^{]*\{([\s\S]*?)\};/)?.[1] ?? "";
const pins = [...block.matchAll(/(?:"([^"]+)"|\[LABELS_FILE\])\s*:\s*"([0-9a-f]{64})"/g)].map(
  (m) => [m[1] ?? labelsFile, m[2]],
);
if (!base || !pins.length) {
  console.error("Could not read the pinned base URL or hashes from models.ts");
  process.exit(2);
}

const out = process.argv[2];
if (out) mkdirSync(out, { recursive: true });
let bad = 0;
console.log(`Pinned: ${base}`);
for (const [file, want] of pins) {
  const res = await fetch(`${base}/${file}`);
  if (!res.ok) {
    console.error(`✗ ${file}: HTTP ${res.status}`);
    bad++;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const got = createHash("sha256").update(buf).digest("hex");
  const ok = got === want;
  console.log(`${ok ? "✓" : "✗"} ${file}  ${got}${ok ? "" : `  (pinned ${want})`}`);
  if (!ok) bad++;
  if (out) writeFileSync(join(out, file), buf);
}
process.exit(bad ? 1 : 0);
