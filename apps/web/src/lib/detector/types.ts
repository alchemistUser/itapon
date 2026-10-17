// SPDX-License-Identifier: AGPL-3.0-or-later
// Same shape as the FastAPI reference contract (services/ml-api/app/schemas.py), so
// result screens don't care whether inference ran in the browser or on a server.

export type Category = "biodegradable" | "recyclable" | "residual" | "hazardous";

/** Normalized 0–1, relative to the original (un-letterboxed) image. */
export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  class_key: string;
  confidence: number;
  bbox: BBox;
  default_category: Category;
}

export interface Label {
  index: number;
  class_key: string;
  default_category: Category;
}

export interface LabelsFile {
  model_version: string;
  labels: Label[];
}

export interface ModelSpec {
  id: string;
  file: string;
  imgsz: number;
  /** Approximate download size, for the loading screen before Content-Length arrives. */
  approxMB: number;
}

export interface LoadProgress {
  phase: "download" | "init" | "warmup";
  loaded?: number;
  total?: number;
}

export interface ReadyInfo {
  modelVersion: string;
  modelId: string;
  backend: "wasm";
  threads: number;
  fromCache: boolean;
  loadMs: number;
}

export interface DetectResult {
  detections: Detection[];
  inferenceMs: number;
}

// --- worker protocol ---------------------------------------------------------------

export type ToWorker =
  | {
      type: "load";
      modelUrl: string;
      labelsUrl: string;
      model: ModelSpec;
      wasmPath: string;
      minConfidence: number;
    }
  | { type: "detect"; id: number; bitmap: ImageBitmap };

export type FromWorker =
  | { type: "progress"; progress: LoadProgress }
  | { type: "ready"; info: ReadyInfo }
  | { type: "result"; id: number; result: DetectResult }
  | { type: "error"; id?: number; message: string };
