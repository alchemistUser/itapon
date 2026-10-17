// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ModelSpec } from "./types";

/**
 * Model files live in the Hugging Face model repo `itapon-yolo`, pinned to a tag (D12),
 * so a model update is a deliberate code change. Dev uses /models, which
 * scripts/copy-models.mjs fills from services/ml-api/weights. NEXT_PUBLIC_MODEL_BASE_URL
 * overrides both (e.g. to test a new tag on a preview deployment).
 */
export const PINNED_MODEL_BASE_URL =
  "https://huggingface.co/alchemistUserhf/itapon-yolo/resolve/v0.1";

export const MODEL_BASE_URL = (
  process.env.NEXT_PUBLIC_MODEL_BASE_URL ||
  (process.env.NODE_ENV === "development" ? "/models" : PINNED_MODEL_BASE_URL)
).replace(/\/$/, "");

export const LABELS_FILE = "itapon-world-v0.labels.json";

/**
 * SHA-256 of every file published under PINNED_MODEL_BASE_URL (Phase 22, D12 integrity).
 * The worker refuses a model or labels file whose bytes don't match, cached or downloaded.
 * Update together with the tag: `sha256sum` the files (HF's X-Linked-ETag is the same value).
 */
export const PINNED_SHA256: Record<string, string> = {
  "itapon-world-v0-480-int8.onnx":
    "0b89da2d8a5d39d40d1f5e766de78fc00b24bc03e2a802fb55c5e663bc4dba82",
  "itapon-world-v0-640-int8.onnx":
    "293b9de1ff86e5cce9a06bbd79dd7831005cd4c6c1811b96498b1cab2e65c6d4",
  [LABELS_FILE]: "c34762c48a51802aed474de726447b38d9368f4362ba918c6605add16d468283",
};

/** Expected hash for a file, or null when not loading from the pinned tag (dev, previews). */
export function expectedSha256(file: string): string | null {
  return MODEL_BASE_URL === PINNED_MODEL_BASE_URL ? (PINNED_SHA256[file] ?? "missing") : null;
}

export const MODELS: Record<string, ModelSpec> = {
  "int8-640": { id: "int8-640", file: "itapon-world-v0-640-int8.onnx", imgsz: 640, approxMB: 13 },
  "int8-480": { id: "int8-480", file: "itapon-world-v0-480-int8.onnx", imgsz: 480, approxMB: 13 },
  "fp32-640": { id: "fp32-640", file: "itapon-world-v0-640.onnx", imgsz: 640, approxMB: 50 },
  "fp32-480": { id: "fp32-480", file: "itapon-world-v0-480.onnx", imgsz: 480, approxMB: 50 },
};

/**
 * INT8 at 480 px: smallest download (13 MB) and fastest. Desktop browser benchmark
 * (2026-10-17, WASM x4 threads): p50 419 ms vs 701 ms for int8-640. Revisit after
 * real-phone benchmarks; kiosks with stronger hardware may prefer int8-640.
 */
export const DEFAULT_MODEL_ID = "int8-480";

/** Lowest score kept (matches MIN_CONFIDENCE in the FastAPI reference). */
export const MIN_CONFIDENCE = 0.1;
/** Display tiers (provisional until a trained model, see Phase 7). */
export const CONFIDENT_THRESHOLD = 0.35;
export const POSSIBLE_THRESHOLD = 0.15;

export const WASM_PATH = "/ort/";
export const MODEL_CACHE = "itapon-models-v1";

export function modelUrl(spec: ModelSpec): string {
  return `${MODEL_BASE_URL}/${spec.file}`;
}

export function labelsUrl(): string {
  return `${MODEL_BASE_URL}/${LABELS_FILE}`;
}
