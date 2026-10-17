// SPDX-License-Identifier: AGPL-3.0-or-later
// Dev helper: copy locally built ONNX models from services/ml-api/weights into
// public/models so the app can load them before they're published to Hugging Face.
// Skips silently when nothing has been built (e.g. on Vercel/CI).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "..", "..", "services", "ml-api", "weights");
const out = join(root, "public", "models");

if (!existsSync(src)) process.exit(0);
const files = readdirSync(src).filter((f) => f.endsWith(".onnx") || f.endsWith(".labels.json"));
if (files.length === 0) process.exit(0);

mkdirSync(out, { recursive: true });
for (const f of files) copyFileSync(join(src, f), join(out, f));
console.log(`copy-models: ${files.length} files → public/models`);
