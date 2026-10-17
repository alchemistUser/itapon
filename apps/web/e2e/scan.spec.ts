// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";

import { hasFakeCamera } from "./fixtures";

// Scan → result with Chrome's fake camera playing a sample photo (D12: on-device model).
test("live scan locks a result from the camera", async ({ page }) => {
  test.skip(!hasFakeCamera(), "no sample photo / ffmpeg for the fake camera");
  test.setTimeout(150_000); // the first run downloads the 13 MB model
  await page.goto("/scan");
  await expect(page.getByRole("status").filter({ hasText: /Bin\./ })).toContainText(
    /(Blue|Green|Black|Red) Bin\./,
    { timeout: 120_000 },
  );
  await expect(
    page.getByRole("button", { name: /Scan again|Next Scan/ }).filter({ visible: true }),
  ).toHaveCount(1);
});
