// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";

test("Bin Guide search finds items in Filipino and opens the bin page", async ({ page }) => {
  await page.goto("/guide");
  await page.getByRole("searchbox").fill("baterya");
  await expect(page.getByRole("link", { name: /Battery/ }).first()).toBeVisible();
  await page.goto("/guide/hazardous");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Hazardous/i);
  await expect(page.getByText("Battery").first()).toBeVisible();
});

test("result page for an item shows its bin", async ({ page }) => {
  await page.goto("/scan/result/banana_peel");
  // phone layout says "Green Bin", the desktop panel "Biodegradable"
  await expect(
    page.locator("h1, h2").filter({ visible: true, hasText: /Green Bin|Biodegradable/ }),
  ).toHaveCount(1);
});

test("home links to the privacy notice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy" }).first().click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "Privacy notice" })).toBeVisible();
  await expect(page.getByText("Republic Act No. 10173", { exact: false })).toBeVisible();
});
