// SPDX-License-Identifier: AGPL-3.0-or-later
// Copy the onnxruntime-web WASM engine into public/ort so it is served from our own
// origin (works offline via the PWA cache, no third-party CDN). Runs on postinstall.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = dirname(require.resolve("onnxruntime-web/wasm"));
const out = join(root, "public", "ort");

// Plain WASM (CPU) build: matches `onnxruntime-web/wasm`, used with the INT8 model (D12).
const files = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

mkdirSync(out, { recursive: true });
for (const f of files) copyFileSync(join(dist, f), join(out, f));
console.log(`copy-ort: ${files.length} files → public/ort`);
