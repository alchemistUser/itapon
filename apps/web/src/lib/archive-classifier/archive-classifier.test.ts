// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BIN_ORDER } from "@/lib/bins";
import {
  ARCHIVE_LABELS_FILE,
  ARCHIVE_MIN_CONFIDENCE,
  ARCHIVE_MODEL,
  ARCHIVE_PINNED_SHA256,
} from "@/lib/detector/models";

import {
  ARCHIVE_BY_KEY,
  ARCHIVE_BY_NAME,
  ARCHIVE_CLASSES,
  ARCHIVE_ONLY_KEYS,
  SHARED_WITH_V1,
} from "./classes";
import {
  isNearlyUniform,
  rankScores,
  rgbaToNhwc,
  toProbabilities,
  topDetection,
} from "./processing";

// The model's own class order (from the package's labels.json, pinned in models.ts).
const MODEL_CLASSES = [
  "battery",
  "biological",
  "brown-glass",
  "cardboard",
  "clothes",
  "green-glass",
  "metal",
  "paper",
  "plastic",
  "shoes",
  "trash",
  "white-glass",
];

describe("archive classes", () => {
  it("cover exactly the model's 12 classes, each once", () => {
    expect(ARCHIVE_CLASSES.map((c) => c.name).sort()).toEqual([...MODEL_CLASSES].sort());
    expect(new Set(ARCHIVE_CLASSES.map((c) => c.classKey)).size).toBe(12);
  });

  it("map to the approved RA 9003 bins", () => {
    const bin = (n: string) => ARCHIVE_BY_NAME.get(n)?.category;
    expect(bin("battery")).toBe("hazardous");
    expect(bin("biological")).toBe("biodegradable");
    for (const n of [
      "brown-glass",
      "green-glass",
      "white-glass",
      "cardboard",
      "paper",
      "metal",
      "plastic",
    ])
      expect(bin(n), n).toBe("recyclable");
    for (const n of ["clothes", "shoes", "trash"]) expect(bin(n), n).toBe("residual");
    for (const c of ARCHIVE_CLASSES) expect(BIN_ORDER).toContain(c.category);
  });

  it("reuse the existing v1 items for battery and cardboard only", () => {
    expect([...SHARED_WITH_V1].sort()).toEqual(["battery", "cardboard"]);
    expect(ARCHIVE_ONLY_KEYS.size).toBe(10);
    expect(ARCHIVE_BY_KEY.get("battery")?.name).toBe("battery");
  });

  it("have a content item for every archive key (with the same bin)", async () => {
    const { getItem } = await import("@/lib/content");
    for (const c of ARCHIVE_CLASSES) {
      const item = getItem(c.classKey);
      expect(item, c.classKey).toBeDefined();
      expect(item?.category, c.classKey).toBe(c.category);
      expect(item?.nameFil, c.classKey).toBeTruthy();
    }
  });

  it("match the label file shipped with the model, whose hash is the pinned one", () => {
    const bytes = readFileSync(join(__dirname, "labels.json"));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      ARCHIVE_PINNED_SHA256[ARCHIVE_LABELS_FILE],
    );
    const labels = JSON.parse(bytes.toString("utf-8")) as {
      class_names: string[];
      input_size: number[];
    };
    expect(labels.class_names).toEqual(MODEL_CLASSES);
    expect(labels.input_size).toEqual([ARCHIVE_MODEL.imgsz, ARCHIVE_MODEL.imgsz]);
  });
});

describe("processing", () => {
  it("converts RGBA to NHWC RGB without touching alpha", () => {
    const rgba = [10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255];
    const out = rgbaToNhwc(rgba, 2, new Float32Array(12));
    expect(Array.from(out)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
  });

  it("keeps probabilities and softmaxes logits", () => {
    expect(toProbabilities([0.7, 0.2, 0.1])).toEqual([0.7, 0.2, 0.1]);
    const p = toProbabilities([2, 1, 0]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(p[0]).toBeGreaterThan(p[1]);
  });

  it("ranks scores and refuses a size mismatch", () => {
    const r = rankScores([0.1, 0.6, 0.3], ["a", "b", "c"]);
    expect(r.map((s) => s.name)).toEqual(["b", "c", "a"]);
    expect(() => rankScores([0.5, 0.5], ["a", "b", "c"])).toThrow(/3 classes/);
  });

  const scores = (name: string, p: number) => {
    const rest = (1 - p) / 11;
    return MODEL_CLASSES.map((c) => (c === name ? p : rest));
  };

  it("returns one full-frame detection with the item key and bin", () => {
    const d = topDetection(scores("plastic", 0.9), MODEL_CLASSES, 0.6);
    expect(d).toMatchObject({
      class_key: "plastic",
      default_category: "recyclable",
      bbox: { x1: 0, y1: 0, x2: 1, y2: 1 },
    });
    expect(d?.confidence).toBeCloseTo(0.9, 3);
    expect(topDetection(scores("white-glass", 0.8), MODEL_CLASSES, 0.6)?.class_key).toBe(
      "white_glass",
    );
  });

  it("reports nothing below the minimum, so an empty scene isn't an answer", () => {
    expect(topDetection(scores("trash", 0.5), MODEL_CLASSES, 0.6)).toBeNull();
    expect(topDetection(new Array(12).fill(1 / 12), MODEL_CLASSES, 0.6)).toBeNull();
  });

  it("skips flat frames (covered lens, plain wall) but not real photos", () => {
    const flat = (r: number, g: number, b: number) =>
      Array.from({ length: 64 }, () => [r, g, b, 255]).flat();
    expect(isNearlyUniform(flat(0, 0, 0))).toBe(true);
    expect(isNearlyUniform(flat(255, 255, 255))).toBe(true);
    expect(isNearlyUniform(flat(200, 190, 170))).toBe(true);
    // a busy frame: alternating dark and light pixels
    const busy = Array.from({ length: 64 }, (_, i) =>
      i % 2 ? [30, 30, 30, 255] : [220, 220, 220, 255],
    ).flat();
    expect(isNearlyUniform(busy)).toBe(false);
    expect(isNearlyUniform([])).toBe(true);
  });

  it("gates at the tuned minimum: a clear answer passes, a doubtful one doesn't", () => {
    expect(ARCHIVE_MIN_CONFIDENCE).toBe(0.7);
    const key = (name: string, p: number) =>
      topDetection(scores(name, p), MODEL_CLASSES, ARCHIVE_MIN_CONFIDENCE)?.class_key;
    expect(key("plastic", 0.95)).toBe("plastic");
    expect(key("white-glass", 0.71)).toBe("white_glass");
    expect(key("metal", 0.58)).toBeUndefined();
  });

  it("rejects a class the app doesn't know", () => {
    expect(() => topDetection([0.9, 0.1], ["unicorn", "plastic"], 0.5)).toThrow(/unknown class/);
  });
});
