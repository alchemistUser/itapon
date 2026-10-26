// SPDX-License-Identifier: AGPL-3.0-or-later
// Phase 24: download every file pinned in src/lib/detector/models.ts from its pinned HF tag
// and check it against the pinned SHA-256: the YOLO-World files (PINNED_SHA256) and the archive
// classifier files (ARCHIVE_PINNED_SHA256, D28). Exits 1 on any mismatch.
//   node scripts/verify-model-pins.mjs [outDir]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(new URL("../src/lib/detector/models.ts", import.meta.url), "utf8");

/** `export const NAME = "value"` */
const constant = (name) => src.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`))?.[1];

/** Entries of `export const NAME: Record<…> = { "file": "hash", [CONST]: "hash" }`. */
function pinBlock(name, consts) {
  const block =
    src.match(new RegExp(`export const ${name}\\b[^{]*\\{([\\s\\S]*?)\\};`))?.[1] ?? "";
  return [...block.matchAll(/(?:"([^"]+)"|\[([A-Z_]+)\])\s*:\s*"([0-9a-f]{64})"/g)].map((m) => [
    m[1] ?? consts[m[2]],
    m[3],
  ]);
}

const sets = [
  {
    name: "YOLO-World",
    base: constant("PINNED_MODEL_BASE_URL"),
    pins: pinBlock("PINNED_SHA256", { LABELS_FILE: constant("LABELS_FILE") }),
  },
  {
    name: "Archive classifier",
    base: constant("ARCHIVE_PINNED_BASE_URL"),
    pins: pinBlock("ARCHIVE_PINNED_SHA256", {
      ARCHIVE_MODEL_FILE: constant("ARCHIVE_MODEL_FILE"),
      ARCHIVE_LABELS_FILE: constant("ARCHIVE_LABELS_FILE"),
    }),
  },
];

for (const s of sets) {
  if (!s.base || !s.pins.length || s.pins.some(([f]) => !f)) {
    console.error(`Could not read the pinned base URL or hashes for ${s.name} from models.ts`);
    process.exit(2);
  }
}

const out = process.argv[2];
if (out) mkdirSync(out, { recursive: true });
let bad = 0;
for (const { name, base, pins } of sets) {
  console.log(`${name}, pinned: ${base}`);
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
}
process.exit(bad ? 1 : 0);
