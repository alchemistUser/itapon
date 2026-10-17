// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure pre/post-processing. Must match services/ml-api/scripts/shrink_onnx.py `letterbox`
// and the export in scripts/export_onnx.py (NMS embedded, output [1, maxDet, 6]).
import type { Detection, Label } from "./types";

export interface Letterbox {
  scale: number;
  padX: number;
  padY: number;
  width: number; // drawn (resized) image size inside the square
  height: number;
}

export function letterboxGeometry(srcW: number, srcH: number, size: number): Letterbox {
  const scale = size / Math.max(srcW, srcH);
  const width = Math.round(srcW * scale);
  const height = Math.round(srcH * scale);
  return {
    scale,
    width,
    height,
    padX: Math.floor((size - width) / 2),
    padY: Math.floor((size - height) / 2),
  };
}

/** RGBA pixels (row-major) → float32 CHW scaled 0–1, written into `out` (reused buffer). */
export function rgbaToChw(rgba: Uint8ClampedArray, size: number, out: Float32Array): Float32Array {
  const plane = size * size;
  for (let i = 0, p = 0; p < plane; i += 4, p++) {
    out[p] = rgba[i] / 255;
    out[plane + p] = rgba[i + 1] / 255;
    out[2 * plane + p] = rgba[i + 2] / 255;
  }
  return out;
}

const clip01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Model output rows: x1, y1, x2, y2 (letterboxed input pixels), score, class index.
 * Returns detections normalized to the original image, best first.
 */
export function decodeDetections(
  output: Float32Array,
  labels: Label[],
  box: Letterbox,
  srcW: number,
  srcH: number,
  minConfidence: number,
): Detection[] {
  const detections: Detection[] = [];
  for (let r = 0; r + 6 <= output.length; r += 6) {
    const score = output[r + 4];
    if (!(score >= minConfidence)) continue;
    const label = labels[Math.round(output[r + 5])];
    // Unknown index, or a not-waste distractor (mug, phone, hand…) that won NMS: drop it.
    if (!label || label.ignore || label.default_category === "none") continue;
    const toX = (v: number) => clip01((v - box.padX) / box.scale / srcW);
    const toY = (v: number) => clip01((v - box.padY) / box.scale / srcH);
    detections.push({
      class_key: label.class_key,
      default_category: label.default_category,
      confidence: Math.round(score * 1e4) / 1e4,
      bbox: {
        x1: toX(output[r]),
        y1: toY(output[r + 1]),
        x2: toX(output[r + 2]),
        y2: toY(output[r + 3]),
      },
    });
  }
  return detections.sort((a, b) => b.confidence - a.confidence);
}
