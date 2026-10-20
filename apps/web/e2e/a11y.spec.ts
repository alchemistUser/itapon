// SPDX-License-Identifier: AGPL-3.0-or-later
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Phase 17 / 23: no serious or critical axe violations (WCAG 2.1 A/AA) on the main pages.
const PAGES = [
  "/",
  "/guide",
  "/guide/hazardous",
  "/scan/result/battery",
  "/history",
  "/account",
  "/privacy",
  "/offline",
  "/library",
  "/library/pla",
  "/library/pla/pla-1",
  "/library/item/aa-battery",
  "/library/dropoff",
  "/missions",
];

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => {});
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.length} x ${v.help}`)).toEqual([]);
  });
}
