// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { getItem } from "@/lib/content";
import type { Category, Detection } from "@/lib/detector/types";

import { ARCHIVE_BY_KEY, ARCHIVE_KEYS } from "./classes";
import {
  CONFUSABLE,
  combineDetections,
  HAZARDOUS_SPECIFIC,
  HAZARD_OVERRIDE_MIN,
  OVERRIDE_MIN,
  REFINES,
  SOLO_HAZARD_MIN,
  SOLO_MIN,
} from "./hybrid";

const det = (class_key: string, confidence: number, default_category: Category): Detection => ({
  class_key,
  confidence,
  default_category,
  bbox: { x1: 0, y1: 0, x2: 1, y2: 1 },
});
const arch = (key: string, p = 0.95): Detection => det(key, p, ARCHIVE_BY_KEY.get(key)!.category);
const yolo = (key: string, p: number): Detection => {
  const item = getItem(key);
  if (!item) throw new Error(`unknown YOLO item ${key}`);
  return det(key, p, item.category);
};

describe("the tables", () => {
  it("only refer to real items and archive classes", () => {
    for (const [specific, answers] of Object.entries(CONFUSABLE)) {
      expect(getItem(specific), specific).toBeDefined();
      expect(getItem(specific)?.detectable, specific).toBe(true);
      for (const a of answers) expect(ARCHIVE_KEYS, `${specific} → ${a}`).toContain(a);
    }
    for (const [coarse, specifics] of Object.entries(REFINES)) {
      expect(ARCHIVE_KEYS).toContain(coarse);
      for (const s of specifics) {
        expect(getItem(s)?.detectable, s).toBe(true);
        // refining must never change the bin
        expect(getItem(s)?.category, s).toBe(ARCHIVE_BY_KEY.get(coarse)?.category);
      }
    }
  });

  it("cover the specific items the classifier still cannot name", () => {
    expect(Object.keys(CONFUSABLE).sort()).toEqual(
      [
        "expired_medicine",
        "light_bulb",
        "sanitary_napkin",
        "soiled_food_container",
        "spray_can",
        "used_tissue",
      ].sort(),
    );
    for (const h of HAZARDOUS_SPECIFIC) expect(getItem(h)?.category).toBe("hazardous");
  });

  it("treat hazardous items more eagerly than the rest", () => {
    expect(HAZARD_OVERRIDE_MIN).toBeLessThan(OVERRIDE_MIN);
    expect(SOLO_HAZARD_MIN).toBeLessThan(SOLO_MIN);
    expect(SOLO_MIN).toBeLessThan(OVERRIDE_MIN); // an unsure classifier asks less of YOLO
  });
});

describe("combineDetections with a classifier answer", () => {
  it("keeps the classifier's answer when YOLO has nothing", () => {
    expect(combineDetections(arch("plastic"), [])).toEqual(arch("plastic"));
  });

  it("lets YOLO name a specific item the classifier files under a broader class", () => {
    expect(
      combineDetections(arch("plastic"), [yolo("soiled_food_container", 0.5)])?.class_key,
    ).toBe("soiled_food_container");
    expect(combineDetections(arch("paper"), [yolo("used_tissue", 0.46)])?.class_key).toBe(
      "used_tissue",
    );
    expect(combineDetections(arch("trash"), [yolo("sanitary_napkin", 0.6)])?.class_key).toBe(
      "sanitary_napkin",
    );
  });

  it("needs YOLO to be sure enough", () => {
    expect(
      combineDetections(arch("plastic"), [yolo("soiled_food_container", 0.44)])?.class_key,
    ).toBe("plastic");
  });

  it("catches hazardous items at the lower threshold (no bulb in the blue bin)", () => {
    const bulb = combineDetections(arch("white_glass"), [yolo("light_bulb", 0.41)]);
    expect(bulb?.class_key).toBe("light_bulb");
    expect(bulb?.default_category).toBe("hazardous");
    expect(combineDetections(arch("metal"), [yolo("spray_can", 0.4)])?.default_category).toBe(
      "hazardous",
    );
    expect(combineDetections(arch("plastic"), [yolo("expired_medicine", 0.42)])?.class_key).toBe(
      "expired_medicine",
    );
    // but a non-hazardous item at the same score is not enough
    expect(
      combineDetections(arch("plastic"), [yolo("soiled_food_container", 0.41)])?.class_key,
    ).toBe("plastic");
  });

  it("never lets YOLO override with an implausible mix-up (a battery photo stays a battery)", () => {
    expect(combineDetections(arch("battery"), [yolo("spray_can", 0.9)])?.class_key).toBe("battery");
    expect(combineDetections(arch("shoes"), [yolo("light_bulb", 0.9)])?.class_key).toBe("shoes");
    expect(combineDetections(arch("clothes"), [yolo("used_tissue", 0.9)])?.class_key).toBe(
      "clothes",
    );
  });

  it("does not let YOLO overrule the classifier on items the classifier handles", () => {
    expect(combineDetections(arch("battery"), [yolo("cardboard", 0.9)])?.class_key).toBe("battery");
    expect(combineDetections(arch("biological"), [yolo("paper_bag", 0.9)])?.class_key).toBe(
      "biological",
    );
  });

  it("refines a coarse answer into a specific item of the same bin", () => {
    const d = combineDetections(arch("plastic", 0.93), [yolo("plastic_bottle", 0.6)]);
    expect(d?.class_key).toBe("plastic_bottle");
    expect(d?.default_category).toBe("recyclable");
    expect(d?.confidence).toBe(0.93); // the classifier's confidence is kept
    expect(combineDetections(arch("metal"), [yolo("aluminum_can", 0.5)])?.class_key).toBe(
      "aluminum_can",
    );
    expect(combineDetections(arch("biological"), [yolo("banana_peel", 0.5)])?.class_key).toBe(
      "banana_peel",
    );
  });

  it("does not refine into a different bin or below the threshold", () => {
    expect(combineDetections(arch("plastic"), [yolo("plastic_bottle", 0.4)])?.class_key).toBe(
      "plastic",
    );
    expect(combineDetections(arch("paper"), [yolo("banana_peel", 0.9)])?.class_key).toBe("paper");
  });

  it("prefers the most confident qualifying YOLO detection", () => {
    const d = combineDetections(arch("trash"), [
      yolo("used_tissue", 0.5),
      yolo("sanitary_napkin", 0.7),
    ]);
    expect(d?.class_key).toBe("sanitary_napkin");
  });
});

describe("combineDetections without a classifier answer (unsure or odd view)", () => {
  it("lets YOLO answer for any item it knows, at its own confident level", () => {
    expect(combineDetections(null, [])).toBeNull();
    expect(combineDetections(null, [yolo("plastic_cup", 0.34)])).toBeNull();
    expect(combineDetections(null, [yolo("plastic_cup", 0.36)])?.class_key).toBe("plastic_cup");
    expect(combineDetections(null, [yolo("used_tissue", 0.5)])?.class_key).toBe("used_tissue");
    expect(combineDetections(null, [yolo("light_bulb", 0.31)])?.class_key).toBe("light_bulb");
    expect(combineDetections(null, [yolo("used_tissue", 0.31)])).toBeNull();
  });

  it("picks the most confident detection", () => {
    expect(
      combineDetections(null, [yolo("paper_bag", 0.5), yolo("plastic_cup", 0.7)])?.class_key,
    ).toBe("plastic_cup");
  });
});
