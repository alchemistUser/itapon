// SPDX-License-Identifier: AGPL-3.0-or-later
// "Hold the item steady" (Phase 12): lock a result only when the same item is the top
// detection in `need` of the last `window` frames, so single noisy frames never flicker.
import { POSSIBLE_THRESHOLD } from "@/lib/detector/models";
import type { Detection } from "@/lib/detector/types";

export interface FrameTop {
  classKey: string;
  confidence: number;
}

export type Stability =
  | { status: "searching" }
  | { status: "tentative"; classKey: string; confidence: number }
  | { status: "locked"; classKey: string; confidence: number };

export interface StabilityOptions {
  need: number;
  window: number;
  min: number;
}

export const DEFAULT_STABILITY: StabilityOptions = { need: 3, window: 4, min: POSSIBLE_THRESHOLD };

/** Highest-confidence detection of a frame (detections arrive sorted, but don't rely on it). */
export function topOf(detections: Detection[]): FrameTop | null {
  let best: Detection | null = null;
  for (const d of detections) if (!best || d.confidence > best.confidence) best = d;
  return best ? { classKey: best.class_key, confidence: best.confidence } : null;
}

export function evaluateStability(
  history: (FrameTop | null)[],
  opts: StabilityOptions = DEFAULT_STABILITY,
): Stability {
  const recent = history.slice(-opts.window);
  const groups = new Map<string, number[]>();
  for (const f of recent) {
    if (f && f.confidence >= opts.min) {
      groups.set(f.classKey, [...(groups.get(f.classKey) ?? []), f.confidence]);
    }
  }

  let bestKey: string | null = null;
  let bestScores: number[] = [];
  for (const [key, scores] of groups) {
    const better =
      scores.length > bestScores.length ||
      (scores.length === bestScores.length && mean(scores) > mean(bestScores));
    if (better) {
      bestKey = key;
      bestScores = scores;
    }
  }

  if (bestKey && bestScores.length >= opts.need) {
    return { status: "locked", classKey: bestKey, confidence: round(mean(bestScores)) };
  }
  const last = recent.at(-1);
  if (last && last.confidence >= opts.min) {
    return { status: "tentative", classKey: last.classKey, confidence: last.confidence };
  }
  return { status: "searching" };
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function round(x: number) {
  return Math.round(x * 1e4) / 1e4;
}
