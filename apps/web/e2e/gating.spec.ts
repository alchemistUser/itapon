// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";

test("the admin dashboard is gated for non-admins", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admins only" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Export CSV")).toHaveCount(0);
});

test("history works for a new visitor", async ({ page }) => {
  await page.goto("/history");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/something went wrong/i);
});

test("security headers are sent", async ({ request }) => {
  const res = await request.get("/scan");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["permissions-policy"]).toContain("camera=(self)");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["cross-origin-embedder-policy"]).toBe("require-corp");
});
