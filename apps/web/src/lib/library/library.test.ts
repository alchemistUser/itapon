// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import {
  candidatesFor,
  chooserTip,
  confusedWith,
  itemsIn,
  materialPath,
  pick,
  rulesFor,
  topIdea,
  whereElse,
} from "./core";
import { createLibrarySearch, resinQuery } from "./search";
import type { LibraryIndexItem, LibraryItem, LibraryMaterial } from "./types";

const mat = (code: string, name: string, parent: string | null = null): LibraryMaterial => ({
  code,
  parent,
  name_en: name,
  name_fil: name,
  description_en: null,
  description_fil: null,
  resin_code: null,
  default_bin: null,
});

const MATERIALS = [
  mat("PLA", "Plastics"),
  mat("PLA-1", "#1 PET", "PLA"),
  mat("PLA-2", "#2 HDPE", "PLA"),
  mat("PLA-6", "#6 PS and styrofoam", "PLA"),
  mat("CER", "Ceramics & porcelain"),
  mat("CER-DISH", "Dishware", "CER"),
  mat("GLA", "Glass"),
  mat("GLA-HEAT", "Heat-resistant and drinking glass", "GLA"),
];

const item = (slug: string, over: Partial<LibraryItem> = {}): LibraryItem => ({
  slug,
  name_en: slug,
  name_fil: slug,
  aliases: [],
  material: "PLA-1",
  resin_code: null,
  bin: "recyclable",
  summary_en: "",
  summary_fil: null,
  detectable_class_key: null,
  draft: false,
  destinations: ["bin"],
  prep_en: [],
  prep_fil: [],
  note_en: null,
  note_fil: null,
  dont_en: [],
  dont_fil: [],
  hazard_en: null,
  hazard_fil: null,
  value: null,
  reuse_en: [],
  reuse_fil: [],
  reduce_en: [],
  reduce_fil: [],
  fact_en: null,
  fact_fil: null,
  related: [],
  sources: [],
  reviewed_at: null,
  ...over,
});

const ITEMS: LibraryItem[] = [
  item("plastic-bottle", {
    name_en: "Plastic water bottle",
    name_fil: "Bote ng tubig",
    aliases: ["mineral water", "pet bottle"],
    resin_code: 1,
    detectable_class_key: "plastic_bottle",
  }),
  item("hdpe-shampoo-bottle", {
    name_en: "Shampoo bottle",
    name_fil: "Bote ng shampoo",
    material: "PLA-2",
    resin_code: 2,
    detectable_class_key: "plastic_bottle",
  }),
  item("cooking-oil-bottle", {
    name_en: "Cooking oil bottle",
    name_fil: "Bote ng mantika",
    resin_code: 1,
    detectable_class_key: "plastic_bottle",
  }),
  item("styrofoam", {
    name_en: "Styrofoam",
    name_fil: "Styro",
    material: "PLA-6",
    resin_code: 6,
    bin: "residual",
    related: ["plastic-bottle"],
  }),
  item("ceramic-mug", {
    name_en: "Ceramic mug",
    name_fil: "Tasa",
    material: "CER-DISH",
    bin: "residual",
    related: ["drinking-glass"],
  }),
  item("drinking-glass", {
    name_en: "Drinking glass",
    name_fil: "Baso",
    material: "GLA-HEAT",
    bin: "residual",
  }),
];

describe("resinQuery", () => {
  it.each([
    ["#5", 5],
    ["5", 5],
    ["PP", 5],
    ["pp5", 5],
    ["#5 PP", 5],
    ["pet", 1],
    ["PETE", 1],
    ["hdpe 2", 2],
    ["resin code 6", 6],
  ])("%s → %s", (q, n) => expect(resinQuery(q)).toBe(n));

  it.each(["bottle", "#8", "pp2", "", "12"])("%s is not a resin query", (q) =>
    expect(resinQuery(q)).toBeNull(),
  );
});

describe("createLibrarySearch", () => {
  const search = createLibrarySearch(ITEMS, MATERIALS);
  const slugs = (q: string) => search(q).items.map((i) => i.slug);

  it("finds English, Filipino and aliases, with typos", () => {
    expect(slugs("shampoo")).toContain("hdpe-shampoo-bottle");
    expect(slugs("mantika")).toContain("cooking-oil-bottle");
    expect(slugs("mineral water")).toContain("plastic-bottle");
    expect(slugs("styrofom")).toContain("styrofoam");
  });

  it("finds items by resin code or abbreviation", () => {
    expect(slugs("#2")).toEqual(["hdpe-shampoo-bottle"]);
    expect(slugs("PET")).toEqual(["cooking-oil-bottle", "plastic-bottle"]);
    expect(slugs("ps")).toEqual(["styrofoam"]);
  });

  it("finds items by material name", () => {
    expect(slugs("ceramics")).toContain("ceramic-mug");
  });

  it("suggests the closest name when nothing matches", () => {
    const r = search("stryofaom");
    expect(r.items).toEqual([]);
    expect(r.didYouMean?.slug).toBe("styrofoam");
  });

  it("ignores one-letter queries", () => expect(slugs("s")).toEqual([]));
});

describe("chooser", () => {
  it("lists the migrated v1 item first, then by name", () => {
    expect(candidatesFor(ITEMS, "plastic_bottle").map((i) => i.slug)).toEqual([
      "plastic-bottle",
      "cooking-oil-bottle",
      "hdpe-shampoo-bottle",
    ]);
    expect(candidatesFor(ITEMS, "battery")).toEqual([]);
  });

  it("tips the resin code when candidates differ by plastic", () => {
    expect(chooserTip(candidatesFor(ITEMS, "plastic_bottle"))).toMatch(/triangle/);
    const sameResin: LibraryIndexItem[] = [ITEMS[0], { ...ITEMS[3], resin_code: 1 }];
    expect(chooserTip(sameResin)).toMatch(/same bin/);
  });
});

describe("entry helpers", () => {
  it("picks Filipino when written, else English", () => {
    expect(pick("fil", "Rinse", "Banlawan")).toBe("Banlawan");
    expect(pick("fil", "Rinse", null)).toBe("Rinse");
    expect(pick("fil", ["a"], [])).toEqual(["a"]);
    expect(pick("en", "Rinse", "Banlawan")).toBe("Rinse");
  });

  it("lists where else it can go, without the bin", () => {
    const dests = [
      { code: "bin", name_en: "The bin", name_fil: "Basurahan" },
      { code: "junkshop", name_en: "Junk shop", name_fil: "Junk shop" },
    ];
    expect(whereElse({ destinations: ["bin", "junkshop"] }, dests).map((d) => d.code)).toEqual([
      "junkshop",
    ]);
  });

  it("takes the first reuse idea, else a reduce idea", () => {
    expect(topIdea(item("a", { reuse_en: ["Pot it"], reduce_en: ["Refill"] }))).toEqual({
      kind: "reuse",
      text: "Pot it",
    });
    expect(topIdea(item("a", { reduce_en: ["Refill"] }))?.kind).toBe("reduce");
    expect(topIdea(item("a"))).toBeNull();
  });

  it("finds local rules for the item, its subgroup and its group", () => {
    const rules = [
      {
        lgu: "QC",
        item: "plastic-bottle",
        material: null,
        note_en: "a",
        note_fil: null,
        sources: [],
        draft: false,
      },
      {
        lgu: "QC",
        item: null,
        material: "PLA",
        note_en: "b",
        note_fil: null,
        sources: [],
        draft: false,
      },
      {
        lgu: "QC",
        item: null,
        material: "GLA",
        note_en: "c",
        note_fil: null,
        sources: [],
        draft: false,
      },
    ];
    expect(rulesFor(rules, ITEMS[0]).map((r) => r.note_en)).toEqual(["a", "b"]);
  });

  it("finds commonly confused items in other bins", () => {
    // the scanner can't tell a mug from a glass; styrofoam goes in a different bin than PET
    expect(confusedWith(ITEMS, ITEMS[3]).map((i) => i.slug)).toEqual(["plastic-bottle"]);
    expect(confusedWith(ITEMS, ITEMS[4])).toEqual([]); // same bin: not "confused"
  });

  it("lists a group's items by name and builds paths", () => {
    expect(itemsIn(ITEMS, "PLA-1").map((i) => i.slug)).toEqual([
      "cooking-oil-bottle",
      "plastic-bottle",
    ]);
    expect(itemsIn(ITEMS, "CER")).toHaveLength(1);
    expect(materialPath("PLA")).toBe("/library/pla");
    expect(materialPath("PLA-1")).toBe("/library/pla/pla-1");
  });
});
