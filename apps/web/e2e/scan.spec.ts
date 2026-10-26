// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";

import { hasFakeCamera } from "./fixtures";

// Scan → result with Chrome's fake camera playing a sample photo (D12: on-device model).
test("live scan locks a result from the camera", async ({ page }) => {
  test.skip(!hasFakeCamera(), "no sample photo / ffmpeg for the fake camera");
  test.setTimeout(150_000); // the first run downloads the 9 MB model
  await page.goto("/scan");
  // E2E_EXPECT_BIN=Red|Blue|Green|Black checks the right bin for the sample photo you feed in.
  const bin = process.env.E2E_EXPECT_BIN ?? "(Blue|Green|Black|Red)";
  await expect(page.getByRole("status").filter({ hasText: /Bin\./ })).toContainText(
    new RegExp(`${bin} Bin\\.`),
    { timeout: 120_000 },
  );
  // The archive classifier is the main scanner; "yolo" here means it failed to load.
  await expect(page.getByTestId("scan-log")).toHaveAttribute("data-engine", "archive");
  await expect(
    page.getByRole("button", { name: /Scan again|Next Scan/ }).filter({ visible: true }),
  ).toHaveCount(1);
});

// The archive classifier has no "nothing here" class, so the app skips flat frames and needs
// a confident, stable answer. Run with E2E_EXPECT_NOTHING=1 and a blank photo as the sample
// (e.g. a plain white wall); the scanner must keep searching instead of announcing a bin.
test("an empty scene does not lock a result", async ({ page }) => {
  test.skip(!hasFakeCamera() || !process.env.E2E_EXPECT_NOTHING, "needs a blank sample photo");
  test.setTimeout(90_000);
  await page.goto("/scan");
  await expect(page.getByTestId("scan-log")).toHaveAttribute("data-engine", "archive", {
    timeout: 60_000,
  });
  await page.waitForTimeout(15_000); // plenty of frames at ~4 fps
  await expect(page.getByRole("status").filter({ hasText: /Bin\./ })).toHaveCount(0);
});
