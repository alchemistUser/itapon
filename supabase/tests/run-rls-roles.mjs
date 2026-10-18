// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs supabase/tests/rls-roles.sql (rolled back, safe on dev) and fails on any false check.
//   node supabase/tests/run-rls-roles.mjs     (needs a linked project: supabase link)
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
// Relative path from the repo root: Windows' shell would split an absolute path with spaces.
const args = [
  "supabase",
  "db",
  "query",
  "--linked",
  "-o",
  "json",
  "-f",
  "supabase/tests/rls-roles.sql",
];
const out = execFileSync("npx", args, {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
  stdio: ["ignore", "pipe", "inherit"],
});
// The CLI prints {rows: [...]} in some environments and a bare [...] array in others (CI).
const start = Math.min(...["{", "["].map((c) => out.indexOf(c)).filter((i) => i >= 0));
let parsed;
try {
  parsed = JSON.parse(out.slice(start));
} catch {
  console.error(`Unexpected output from supabase db query:
${out.slice(0, 1500)}`);
  process.exit(2);
}
const rows = Array.isArray(parsed) ? parsed : (parsed.rows ?? []);
for (const r of rows) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.check_name}`);
const failed = rows.filter((r) => !r.ok).length;
if (!rows.length) {
  console.error("No results: did the script run?");
  process.exit(2);
}
console.log(
  failed
    ? `\n${failed} of ${rows.length} checks FAILED`
    : `\nAll ${rows.length} role checks passed`,
);
process.exit(failed ? 1 : 0);
