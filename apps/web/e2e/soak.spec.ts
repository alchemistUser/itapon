// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";

import { hasFakeCamera } from "./fixtures";

// Optional desktop soak with the fake camera: E2E_SOAK_MINUTES=10 pnpm e2e --project=scan
// (phones: open /dev/soak on the device instead; see docs/qa/performance.md).
const MINUTES = Number(process.env.E2E_SOAK_MINUTES ?? 0);

test("soak: continuous scanning stays healthy", async ({ page }) => {
  test.skip(!MINUTES || !hasFakeCamera(), "set E2E_SOAK_MINUTES and provide a sample photo");
  test.setTimeout((MINUTES * 60 + 180) * 1000);
  await page.goto("/dev/soak");
  await page.getByLabel("Minutes").fill(String(MINUTES));
  const start = page.getByRole("button", { name: "Start" });
  await expect(start).toBeEnabled({ timeout: 150_000 });
  await start.click();
  await expect(page.getByText("Done")).toBeVisible({ timeout: (MINUTES * 60 + 60) * 1000 });
  const summary = await page.getByText(/samples · median fps/).textContent();
  console.log(`[soak] ${summary}`);
  const fps = Number(summary?.match(/median fps ([\d.]+)/)?.[1]);
  expect(fps).toBeGreaterThan(0.5);
});
