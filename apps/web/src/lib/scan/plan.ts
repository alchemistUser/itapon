// SPDX-License-Identifier: AGPL-3.0-or-later
// "What to do next" rules (Phase 14 tasks 1–2). Pure functions: easy to test and explain.
import { POSSIBLE_THRESHOLD } from "@/lib/detector/models";
import type { BBox, Category, Detection } from "@/lib/detector/types";

export interface PlanEntry {
  classKey: string;
  category: Category;
  confidence: number;
  bbox: BBox;
}

const area = (b: BBox) => Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);

/** One entry per item type, keeping its most confident box (task 1). */
export function aggregateDetections(
  detections: Detection[],
  min = POSSIBLE_THRESHOLD,
): PlanEntry[] {
  const best = new Map<string, PlanEntry>();
  for (const d of detections) {
    if (d.confidence < min) continue;
    const prev = best.get(d.class_key);
    if (!prev || d.confidence > prev.confidence) {
      best.set(d.class_key, {
        classKey: d.class_key,
        category: d.default_category,
        confidence: d.confidence,
        bbox: d.bbox,
      });
    }
  }
  return [...best.values()];
}

/**
 * Primary + ordered others (task 2).
 * - Primary: the item the scanner locked on (what the user held steady); otherwise the
 *   entry with the largest confidence × box area.
 * - Others: hazardous first (safety), then items with a reuse tip, then the rest;
 *   ties by confidence.
 */
export function orderPlan(
  entries: PlanEntry[],
  hasReuseTip: (classKey: string) => boolean,
  lockedKey?: string,
): { primary: PlanEntry | null; others: PlanEntry[] } {
  if (!entries.length) return { primary: null, others: [] };
  const primary =
    entries.find((e) => e.classKey === lockedKey) ??
    [...entries].sort((a, b) => b.confidence * area(b.bbox) - a.confidence * area(a.bbox))[0];
  const rank = (e: PlanEntry) => (e.category === "hazardous" ? 0 : hasReuseTip(e.classKey) ? 1 : 2);
  const others = entries
    .filter((e) => e !== primary)
    .sort((a, b) => rank(a) - rank(b) || b.confidence - a.confidence);
  return { primary, others };
}
