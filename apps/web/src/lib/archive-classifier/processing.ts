// SPDX-License-Identifier: AGPL-3.0-or-later
// Pre- and post-processing for the archive classifier (pure; unit-tested). The model takes
// one 192×192 RGB image as NHWC float32 with raw 0–255 values (the rescaling is inside the
// exported graph) and returns one probability per class.
import type { Detection } from "@/lib/detector/types";

import { ARCHIVE_BY_NAME } from "./classes";

/** Whole frame: the classifier has no boxes, so detections cover the full image. */
export const FULL_FRAME = { x1: 0, y1: 0, x2: 1, y2: 1 } as const;

/** RGBA canvas bytes → NHWC RGB floats 0–255, written into `out` (no allocation per frame). */
export function rgbaToNhwc(rgba: ArrayLike<number>, size: number, out: Float32Array): Float32Array {
  const pixels = size * size;
  for (let p = 0, o = 0; p < pixels; p++, o += 3) {
    const i = p * 4;
    out[o] = rgba[i];
    out[o + 1] = rgba[i + 1];
    out[o + 2] = rgba[i + 2];
  }
  return out;
}

/**
 * True when the frame is (almost) one flat colour: a covered lens, a dark room, a plain wall.
 * The classifier would still name a class for it, so the worker skips such frames. Spread is
 * the standard deviation of luminance; the lowest of 300 dataset photos was 7.
 */
export function isNearlyUniform(rgba: ArrayLike<number>, maxStd = 6): boolean {
  const n = rgba.length / 4;
  if (!n) return true;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const y = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    sum += y;
    sumSq += y * y;
  }
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sumSq / n - mean * mean)) < maxStd;
}

/**
 * The exported graph ends in a softmax, so values are already probabilities. If a future
 * export returns raw logits instead, apply a softmax so confidences stay meaningful.
 */
export function toProbabilities(values: ArrayLike<number>): number[] {
  const xs = Array.from(values);
  const sum = xs.reduce((a, b) => a + b, 0);
  if (xs.every((v) => v >= 0 && v <= 1) && Math.abs(sum - 1) < 0.01) return xs;
  const max = Math.max(...xs);
  const exps = xs.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

export interface ClassScore {
  name: string;
  probability: number;
}

/** Scores sorted high → low. Throws if the output doesn't match the labels (wrong model). */
export function rankScores(values: ArrayLike<number>, classNames: string[]): ClassScore[] {
  if (values.length !== classNames.length) {
    throw new Error(
      `The classifier returned ${values.length} scores but its labels list ${classNames.length} classes.`,
    );
  }
  return toProbabilities(values)
    .map((probability, i) => ({ name: classNames[i], probability }))
    .sort((a, b) => b.probability - a.probability);
}

/**
 * The single detection for a frame, or null when the model isn't sure enough.
 * A whole-image classifier always names one of its classes, even for an empty table, so
 * below `minConfidence` we report nothing and the scanner keeps searching.
 */
export function topDetection(
  values: ArrayLike<number>,
  classNames: string[],
  minConfidence: number,
): Detection | null {
  const top = rankScores(values, classNames)[0];
  if (top.probability < minConfidence) return null;
  const cls = ARCHIVE_BY_NAME.get(top.name);
  if (!cls) throw new Error(`The classifier returned an unknown class “${top.name}”.`);
  return {
    class_key: cls.classKey,
    confidence: Math.round(top.probability * 1e4) / 1e4,
    bbox: { ...FULL_FRAME },
    default_category: cls.category,
  };
}
