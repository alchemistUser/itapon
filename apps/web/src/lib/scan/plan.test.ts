// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import type { Category, Detection } from "@/lib/detector/types";

import { aggregateDetections, orderPlan } from "./plan";

const det = (
  class_key: string,
  default_category: Category,
  confidence: number,
  size = 0.3,
): Detection => ({
  class_key,
  default_category,
  confidence,
  bbox: { x1: 0, y1: 0, x2: size, y2: size },
});

// The Figma test scene: paper bag, banana peel, snack wrapper, battery.
const scene = [
  det("snack_wrapper", "residual", 0.5),
  det("battery", "hazardous", 0.4, 0.1),
  det("paper_bag", "recyclable", 0.6, 0.6),
  det("banana_peel", "biodegradable", 0.55),
  det("paper_bag", "recyclable", 0.3), // duplicate, weaker
  det("straw", "residual", 0.12), // below the "possibly" cutoff
];
const reuse = new Set(["paper_bag", "plastic_bottle"]);

describe("aggregateDetections", () => {
  it("keeps one entry per item with its best confidence and drops weak ones", () => {
    const out = aggregateDetections(scene);
    expect(out.map((e) => e.classKey).sort()).toEqual([
      "banana_peel",
      "battery",
      "paper_bag",
      "snack_wrapper",
    ]);
    expect(out.find((e) => e.classKey === "paper_bag")?.confidence).toBe(0.6);
  });
});

describe("orderPlan", () => {
  it("uses the locked item as primary and puts hazardous first among the others", () => {
    const { primary, others } = orderPlan(
      aggregateDetections(scene),
      (k) => reuse.has(k),
      "paper_bag",
    );
    expect(primary?.classKey).toBe("paper_bag");
    expect(others.map((e) => e.classKey)).toEqual(["battery", "banana_peel", "snack_wrapper"]);
  });

  it("ranks reuse candidates before the rest", () => {
    const entries = aggregateDetections([
      det("snack_wrapper", "residual", 0.9),
      det("plastic_bottle", "recyclable", 0.4),
      det("leaves", "biodegradable", 0.5),
    ]);
    const { others } = orderPlan(entries, (k) => reuse.has(k), "leaves");
    expect(others.map((e) => e.classKey)).toEqual(["plastic_bottle", "snack_wrapper"]);
  });

  it("without a locked item, picks the biggest confident box as primary", () => {
    const { primary } = orderPlan(aggregateDetections(scene), (k) => reuse.has(k));
    expect(primary?.classKey).toBe("paper_bag");
  });

  it("handles an empty scan", () => {
    expect(orderPlan([], () => false)).toEqual({ primary: null, others: [] });
  });
});
