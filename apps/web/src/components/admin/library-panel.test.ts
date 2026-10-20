// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { libraryRows } from "./library-panel";

describe("libraryRows", () => {
  const counts = [
    { slug: "battery", event: "view" as const, institution: 2, everyone: 9 },
    { slug: "battery", event: "idea_done" as const, institution: 0, everyone: 1 },
    { slug: "plastic-bottle", event: "view" as const, institution: 5, everyone: 6 },
    { slug: "plastic-bottle", event: "chooser" as const, institution: 3, everyone: 3 },
    { slug: "laptop", event: "view" as const, institution: 0, everyone: 1 },
  ];
  const names = new Map([["battery", "Battery"]]);

  it("totals per item, most viewed first, for the chosen scope", () => {
    expect(libraryRows(counts, "institution", names)).toEqual([
      {
        slug: "plastic-bottle",
        name: "plastic-bottle",
        view: 5,
        chooser: 3,
        idea_plan: 0,
        idea_done: 0,
      },
      { slug: "battery", name: "Battery", view: 2, chooser: 0, idea_plan: 0, idea_done: 0 },
    ]);
    expect(libraryRows(counts, "everyone", names).map((r) => [r.slug, r.view])).toEqual([
      ["battery", 9],
      ["plastic-bottle", 6],
      ["laptop", 1],
    ]);
  });
});
