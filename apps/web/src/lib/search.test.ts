// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { ITEMS } from "@/lib/content";

import { createItemSearch } from "./search";

const search = createItemSearch(ITEMS);
const top = (q: string) => {
  const [first] = search(q);
  return first ? `${first.classKey}:${first.category}` : null;
};

describe("Bin Guide search (Phase 15 exit criteria)", () => {
  it.each([
    ["straw", "straw:residual"],
    ["battery", "battery:hazardous"],
    ["saging", "banana_peel:biodegradable"],
    ["balat ng saging", "banana_peel:biodegradable"],
    ["upos", "cigarette_butt:residual"], // Bin-Guide-only item
    ["batery", "battery:hazardous"], // typo
    ["milktea", "plastic_cup:recyclable"],
    ["styro", "styrofoam:residual"],
  ])("%s → %s", (q, expected) => {
    expect(top(q)).toBe(expected);
  });

  it("does not pad results with unrelated near-misses", () => {
    expect(search("saging").map((i) => i.classKey)).toEqual(["banana_peel"]);
  });

  it("returns nothing for empty or one-letter queries", () => {
    expect(search("")).toEqual([]);
    expect(search(" b ")).toEqual([]);
  });
});
