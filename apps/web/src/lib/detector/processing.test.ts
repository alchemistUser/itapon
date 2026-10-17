// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { decodeDetections, letterboxGeometry, rgbaToChw } from "./processing";
import type { Label } from "./types";

const labels: Label[] = [
  { index: 0, class_key: "paper_bag", default_category: "recyclable" },
  { index: 1, class_key: "not_waste", default_category: "none", ignore: true },
];

describe("letterboxGeometry", () => {
  it("fits a landscape image and centres it vertically", () => {
    expect(letterboxGeometry(1280, 720, 480)).toEqual({
      scale: 0.375,
      width: 480,
      height: 270,
      padX: 0,
      padY: 105,
    });
  });
});

describe("rgbaToChw", () => {
  it("splits RGBA pixels into scaled R, G, B planes", () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 51, 102, 153, 255,
    ]);
    const out = rgbaToChw(rgba, 2, new Float32Array(12));
    const r1 = (xs: Float32Array) => Array.from(xs).map((v) => Math.round(v * 10) / 10);
    expect(r1(out.slice(0, 4))).toEqual([1, 0, 0, 0.2]);
    expect(r1(out.slice(4, 8))).toEqual([0, 1, 0, 0.4]);
    expect(r1(out.slice(8, 12))).toEqual([0, 0, 1, 0.6]);
  });
});

describe("decodeDetections", () => {
  const box = letterboxGeometry(1280, 720, 480); // padY 105, scale 0.375
  const row = (x1: number, y1: number, x2: number, y2: number, s: number, c: number) => [
    x1,
    y1,
    x2,
    y2,
    s,
    c,
  ];

  it("un-letterboxes boxes to the original image, normalised 0–1", () => {
    const out = new Float32Array([...row(0, 105, 240, 375, 0.8, 0), ...row(0, 0, 0, 0, 0, 0)]);
    const [d] = decodeDetections(out, labels, box, 1280, 720, 0.1);
    expect(d.class_key).toBe("paper_bag");
    expect(d.default_category).toBe("recyclable");
    expect(d.bbox).toEqual({ x1: 0, y1: 0, x2: 0.5, y2: 1 });
  });

  it("drops low scores, unknown classes and not-waste distractors (F9-2)", () => {
    const out = new Float32Array([
      ...row(0, 105, 240, 375, 0.05, 0), // below min
      ...row(0, 105, 240, 375, 0.9, 1), // not_waste
      ...row(0, 105, 240, 375, 0.9, 7), // no such label
      ...row(240, 105, 480, 375, 0.4, 0),
    ]);
    const ds = decodeDetections(out, labels, box, 1280, 720, 0.1);
    expect(ds).toHaveLength(1);
    expect(ds[0].confidence).toBe(0.4);
  });
});
