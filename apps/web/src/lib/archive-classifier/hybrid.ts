// SPDX-License-Identifier: AGPL-3.0-or-later
// Combines the archive classifier (12 broad categories, the main scanner) with YOLO-World
// (23 specific items) for one answer per frame (D28, amended 2026-11-03).
//
// Why: the classifier has no category for 12 of the specific items (straw, utensil, snack
// wrapper, styrofoam, soiled food container, tetra pack, used tissue, light bulb, medicine,
// spray can, sanitary napkin, face mask), so it files them under plastic, paper, glass, metal or
// trash, and three of them are hazardous. A plain "YOLO wins when it's sure" rule would break
// correct answers (measured on 300 dataset photos: 8% at 0.35), so YOLO may only:
//   1. name one of those 12 items, when the classifier's answer is a plausible mix-up for it;
//   2. refine a coarse answer into a specific item of the SAME bin (plastic → plastic bottle).
// Measured cost of this rule: 1.0% of correct answers changed at the defaults below.
import type { Detection } from "@/lib/detector/types";

/** YOLO needs at least this to name a specific item over the classifier's answer (or alone). */
export const OVERRIDE_MIN = 0.45;
/** Lower for hazardous items: telling someone to put a bulb or medicine in the blue bin is worse. */
export const HAZARD_OVERRIDE_MIN = 0.4;

/**
 * When the classifier has no answer, YOLO alone answers at its own long-standing "confident"
 * level (0.35, CONFIDENT_THRESHOLD), lower for hazardous items. Blank, dark, plain and gradient
 * frames did not lock at this level (e2e/scan.spec.ts, "empty scene").
 */
export const SOLO_MIN = 0.35;
export const SOLO_HAZARD_MIN = 0.3;

export const HAZARDOUS_SPECIFIC = new Set(["light_bulb", "spray_can", "expired_medicine"]);

/**
 * Specific items the classifier cannot represent → the classifier answers (item keys from
 * classes.ts) it gives for them. YOLO may only override one of these answers.
 */
export const CONFUSABLE: Record<string, string[]> = {
  straw: ["plastic", "trash"],
  plastic_utensil: ["plastic", "trash"],
  snack_wrapper: ["plastic", "paper", "trash"],
  styrofoam: ["plastic", "trash", "paper", "white_glass"],
  soiled_food_container: ["plastic", "paper", "cardboard", "trash"],
  tetra_pack: ["cardboard", "paper", "plastic", "trash"],
  used_tissue: ["paper", "biological", "trash"],
  light_bulb: ["white_glass", "plastic", "trash"],
  spray_can: ["metal", "plastic"],
  expired_medicine: ["plastic", "white_glass", "brown_glass", "paper", "metal", "trash"],
  sanitary_napkin: ["trash", "paper", "clothes", "plastic"],
  face_mask: ["clothes", "paper", "trash", "plastic"],
};

/** Coarse answer → specific items of the same bin it may be refined into. */
export const REFINES: Record<string, string[]> = {
  plastic: ["plastic_bottle", "plastic_cup"],
  metal: ["aluminum_can"],
  brown_glass: ["glass_bottle"],
  green_glass: ["glass_bottle"],
  white_glass: ["glass_bottle"],
  paper: ["paper_sheet", "paper_bag"],
  biological: ["banana_peel", "food_scraps", "leaves"],
};

const byConfidence = (a: Detection, b: Detection) => b.confidence - a.confidence;

/**
 * One detection (or none) from the classifier's answer and YOLO's detections for the same
 * frame. `archive` is null when the classifier was unsure or the frame was flat.
 */
export function combineDetections(archive: Detection | null, yolo: Detection[]): Detection | null {
  const ranked = [...yolo].sort(byConfidence);

  if (!archive) {
    // The classifier has no confident answer (an odd angle, a small or unusual item): YOLO may
    // answer for any item it knows, at its own confident level. Flat frames are not an issue:
    // YOLO does not fire on them (tested in e2e/scan.spec.ts).
    for (const y of ranked) {
      const min = HAZARDOUS_SPECIFIC.has(y.class_key) ? SOLO_HAZARD_MIN : SOLO_MIN;
      if (y.confidence >= min) return y;
    }
    return null;
  }

  for (const y of ranked) {
    const min = HAZARDOUS_SPECIFIC.has(y.class_key) ? HAZARD_OVERRIDE_MIN : OVERRIDE_MIN;
    if (CONFUSABLE[y.class_key]?.includes(archive.class_key) && y.confidence >= min) return y;
  }

  for (const y of ranked) {
    if (
      REFINES[archive.class_key]?.includes(y.class_key) &&
      y.default_category === archive.default_category &&
      y.confidence >= OVERRIDE_MIN
    ) {
      // Same bin, more specific name; keep the classifier's (more reliable) confidence.
      return { ...y, confidence: archive.confidence };
    }
  }

  return archive;
}
