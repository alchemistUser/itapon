// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";

// Phase 30: the disposal library. Needs library content in the build; CI builds with
// `build_library.py --preview` (drafts included) because nothing is published yet.

test("library home lists the material groups and searches in English, Filipino and resin codes", async ({
  page,
}) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { level: 1, name: "Disposal library" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Plastics/ }).first()).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search the library" });
  await search.fill("mantika");
  await expect(page.getByRole("link", { name: /Cooking oil bottle/ })).toBeVisible();
  await search.fill("#2");
  await expect(page.getByRole("link", { name: /Shampoo or detergent bottle/ })).toBeVisible();
  await search.fill("styrofom"); // typo
  await expect(page.getByRole("link", { name: /Styrofoam/ }).first()).toBeVisible();
  await search.fill("stryofaom");
  await page.getByRole("button", { name: "Styrofoam" }).click(); // did you mean
  await expect(search).toHaveValue("Styrofoam");
});

test("group and item pages show the full entry, in Filipino too", async ({ page }) => {
  await page.goto("/library/bat");
  await expect(page.getByRole("heading", { level: 1, name: "Batteries", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /AA or AAA battery/ }).click();
  await expect(page).toHaveURL(/\/library\/item\/aa-battery$/);
  await expect(page.getByRole("heading", { level: 1, name: "AA or AAA battery", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to prepare it" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  await expect(page.getByRole("note").filter({ hasText: /Draft/ })).toBeVisible();

  await page.getByRole("button", { name: "Filipino" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "AA o AAA na baterya", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Paano ihanda" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click(); // the preference persists
  await expect(page.getByRole("heading", { level: 1, name: "AA or AAA battery", exact: true })).toBeVisible();
});

test("an entry shows commonly confused items and remembers ideas", async ({ page }) => {
  await page.goto("/library/item/plastic-bottle");
  await expect(page.getByRole("heading", { name: "Reuse and reduce" })).toBeVisible();
  const plan = page.getByRole("button", { name: "I'll do this" }).first();
  await plan.click();
  await expect(page.getByRole("button", { name: "On your list" }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "On your list" }).first()).toBeVisible();
});

test("scan result offers 'Which one is yours?' and links to the entry", async ({ page }) => {
  await page.goto("/scan/result/plastic_bottle");
  const card = page.getByRole("region", { name: "More about this item" }).filter({ visible: true });
  await expect(card.getByText("Which one is yours?")).toBeVisible();
  await expect(card.getByText(/number in the triangle/)).toBeVisible();
  await card.getByRole("button", { name: /Shampoo or detergent bottle/ }).click();
  await expect(card.getByRole("button", { name: /Shampoo or detergent bottle/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await card.getByRole("link", { name: /How to dispose of shampoo/ }).click();
  await expect(page).toHaveURL(/\/library\/item\/hdpe-shampoo-bottle$/);
});

test("a single-item class shows the card without a chooser", async ({ page }) => {
  await page.goto("/scan/result/aluminum_can");
  const card = page.getByRole("region", { name: "More about this item" }).filter({ visible: true });
  await expect(card.getByRole("link", { name: /How to dispose of/ })).toBeVisible();
  await expect(card.getByText("Which one is yours?")).toHaveCount(0);
});

test("drop-off finder filters by type and never invents places", async ({ page }) => {
  await page.goto("/library/dropoff?type=hazdrop");
  await expect(page.getByRole("button", { name: "Hazardous waste" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText(/No verified hazardous waste points yet/)).toBeVisible();
  await page.getByRole("button", { name: "Junk shops" }).click();
  await expect(page).toHaveURL(/type=junkshop/);
  await expect(page.getByText(/No verified junk shops points yet/)).toBeVisible();
});

test("Bin Guide leads into the library", async ({ page }) => {
  await page.goto("/guide");
  await page.getByRole("searchbox").fill("baterya");
  await expect(page.getByRole("link", { name: /Battery/ }).first()).toBeVisible();
  await page.getByRole("searchbox").fill(""); // the results cover the page on desktop
  await page.getByRole("link", { name: /Disposal library/ }).click();
  await expect(page).toHaveURL(/\/library$/);
});
