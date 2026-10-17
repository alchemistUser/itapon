// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { BIN_ORDER } from "@/lib/bins";

import { DETECTABLE_KEYS, getItem, ITEMS } from "./content";

describe("bundled content (spec §4 mapping)", () => {
  it("has unique keys and every item maps to one of the 4 bins with an instruction", () => {
    expect(new Set(ITEMS.map((i) => i.classKey)).size).toBe(ITEMS.length);
    for (const i of ITEMS) {
      expect(BIN_ORDER, i.classKey).toContain(i.category);
      expect(i.instruction.trim().length, i.classKey).toBeGreaterThan(10);
      expect(Array.isArray(i.aliases)).toBe(true);
    }
  });

  it("covers the 23 detectable classes and looks them up by key", () => {
    expect(DETECTABLE_KEYS).toHaveLength(23);
    expect(getItem("battery")?.category).toBe("hazardous");
    expect(getItem("banana_peel")?.category).toBe("biodegradable");
    expect(getItem("not_a_class")).toBeUndefined();
  });

  it("has Filipino names for the detectable items (bilingual guide)", () => {
    const missing = DETECTABLE_KEYS.filter((k) => !getItem(k)?.nameFil);
    expect(missing).toEqual([]);
  });
});
