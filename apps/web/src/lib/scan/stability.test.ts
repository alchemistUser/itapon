// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { evaluateStability, topOf, type FrameTop } from "./stability";

const f = (classKey: string, confidence: number): FrameTop => ({ classKey, confidence });

describe("evaluateStability", () => {
  it("searches with no frames or only weak frames", () => {
    expect(evaluateStability([])).toEqual({ status: "searching" });
    expect(evaluateStability([null, f("paper_bag", 0.05)])).toEqual({ status: "searching" });
  });

  it("is tentative until the same item appears 3 times in the last 4 frames", () => {
    const h = [f("paper_bag", 0.5), f("paper_bag", 0.6)];
    expect(evaluateStability(h)).toMatchObject({ status: "tentative", classKey: "paper_bag" });
  });

  it("locks on 3 of 4 and reports the mean confidence", () => {
    const h = [f("paper_bag", 0.5), null, f("paper_bag", 0.6), f("paper_bag", 0.7)];
    expect(evaluateStability(h)).toEqual({
      status: "locked",
      classKey: "paper_bag",
      confidence: 0.6,
    });
  });

  it("ignores frames older than the window", () => {
    const h = [
      f("paper_bag", 0.9),
      f("paper_bag", 0.9),
      f("battery", 0.4),
      null,
      null,
      f("battery", 0.4),
    ];
    expect(evaluateStability(h).status).not.toBe("locked");
  });

  it("does not lock when two items alternate", () => {
    const h = [
      f("plastic_cup", 0.5),
      f("paper_bag", 0.5),
      f("plastic_cup", 0.5),
      f("paper_bag", 0.5),
    ];
    expect(evaluateStability(h).status).toBe("tentative");
  });

  it("does not count frames below the minimum confidence", () => {
    const h = [f("straw", 0.12), f("straw", 0.12), f("straw", 0.12), f("straw", 0.12)];
    expect(evaluateStability(h)).toEqual({ status: "searching" });
  });
});

describe("topOf", () => {
  it("picks the highest confidence regardless of order", () => {
    const bbox = { x1: 0, y1: 0, x2: 1, y2: 1 };
    expect(
      topOf([
        { class_key: "a", confidence: 0.2, bbox, default_category: "residual" },
        { class_key: "b", confidence: 0.7, bbox, default_category: "recyclable" },
      ]),
    ).toEqual({ classKey: "b", confidence: 0.7 });
    expect(topOf([])).toBeNull();
  });
});
