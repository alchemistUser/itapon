// SPDX-License-Identifier: AGPL-3.0-or-later
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

// Phase 21 exit criterion: "the guide works in airplane mode". Playwright's setOffline()
// doesn't cover requests made by a service worker, so this test runs its own server and
// really stops it after the first visit.
const NEXT_BIN = join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");

async function startServer(port: number, base: string): Promise<ChildProcess> {
  const proc = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(port)], {
    cwd: join(__dirname, ".."),
    stdio: "ignore",
  });
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) return proc;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error("server did not start");
}

test("Bin Guide works offline after one visit", async ({ page }, info) => {
  test.setTimeout(120_000);
  const port = 3101 + info.parallelIndex; // own server per worker (phone/desktop run at once)
  const BASE = `http://localhost:${port}`;
  const server = await startServer(port, BASE);
  try {
    await page.goto(`${BASE}/`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      for (let i = 0; i < 120; i++) {
        const rt = (await caches.keys()).find((k) => k.startsWith("itapon-runtime"));
        if (rt && (await (await caches.open(rt)).match("/__itapon_warm__"))) return;
        await new Promise((r) => setTimeout(r, 500));
      }
      throw new Error("service worker never warmed the offline pages");
    });
  } finally {
    server.kill(); // airplane mode for this origin
  }
  await expect
    .poll(() =>
      fetch(BASE).then(
        () => "up",
        () => "down",
      ),
    )
    .toBe("down");

  await page.goto(`${BASE}/guide/recyclable`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Recyclable/i);
  await page.goto(`${BASE}/guide`);
  await page.getByRole("searchbox").fill("bote");
  await expect(page.getByRole("link", { name: /bottle/i }).first()).toBeVisible();
  await page.goto(`${BASE}/scan/result/battery`);
  await expect(
    page.locator("h1, h2").filter({ visible: true, hasText: /Red Bin|Hazardous/ }),
  ).toHaveCount(1);
  // Phase 30: the library works offline, even item pages never opened online
  await page.goto(`${BASE}/library/gla`);
  await expect(page.getByRole("heading", { level: 1, name: "Glass", exact: true })).toBeVisible();
  await page.goto(`${BASE}/library/item/glass-jar`);
  await expect(page.getByRole("heading", { level: 1, name: /jar/i })).toBeVisible();
  await page.goto(`${BASE}/never-visited-e2e`); // not cached: the offline page instead
  await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
});
