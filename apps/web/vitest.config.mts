// SPDX-License-Identifier: AGPL-3.0-or-later
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Unit tests run in node; component tests (*.test.tsx) opt into jsdom with a
// `// @vitest-environment jsdom` comment (Phase 23).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: { include: ["src/**/*.test.{ts,tsx}"], environment: "node" },
});
