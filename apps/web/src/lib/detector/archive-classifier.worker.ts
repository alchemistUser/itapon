// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs the archive image classifier (12 whole-image classes, MobileNetV2 192 px) off the main
// thread. Same message protocol as detector.worker.ts, so the scan loop, stability gate and
// result screens work unchanged: each frame yields at most one full-frame detection.
import * as ort from "onnxruntime-web/wasm";

import { isNearlyUniform, rgbaToNhwc, topDetection } from "@/lib/archive-classifier/processing";

import { evictOtherModels, fetchJsonCached, fetchWithCache, verify } from "./model-files";
import type { FromWorker, ModelSpec, ToWorker } from "./types";

interface ArchiveLabels {
  model_version: string;
  input_size: [number, number];
  class_names: string[];
}

const scope = self as unknown as Worker;
const post = (msg: FromWorker) => scope.postMessage(msg);

let session: ort.InferenceSession | null = null;
let labels: ArchiveLabels | null = null;
let spec: ModelSpec | null = null;
let minConfidence = 0.6;
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let input: Float32Array | null = null;

async function load(msg: Extract<ToWorker, { type: "load" }>) {
  const start = performance.now();
  spec = msg.model;
  minConfidence = msg.minConfidence;

  ort.env.wasm.wasmPaths = msg.wasmPath;
  // Threads need cross-origin isolation (site-wide COOP/COEP, see next.config.ts).
  const threads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  ort.env.wasm.numThreads = threads;

  labels = await fetchJsonCached<ArchiveLabels>(msg.labelsUrl, msg.labelsSha256);
  if (labels.input_size[0] !== spec.imgsz || labels.input_size[1] !== spec.imgsz) {
    throw new Error("The classifier's labels don't match its input size.");
  }

  const { buffer, fromCache } = await fetchWithCache(msg.modelUrl, (loaded, total) =>
    post({
      type: "progress",
      progress: { phase: "download", loaded, total: total ?? spec!.approxMB * 1e6 },
    }),
  );
  await verify(msg.modelUrl, buffer, msg.modelSha256);
  const tFetched = performance.now();

  post({ type: "progress", progress: { phase: "init" } });
  session = await ort.InferenceSession.create(new Uint8Array(buffer), {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });

  const size = spec.imgsz;
  canvas = new OffscreenCanvas(size, size);
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser cannot prepare images for the classifier.");
  // A camera frame is shrunk about 3x to 192 px. The default (low quality) resize aliases and
  // lowers the model's scores (paper: 0.89 → 0.55 in testing), so ask for the best filter.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  input = new Float32Array(size * size * 3);

  const tSession = performance.now();
  post({ type: "progress", progress: { phase: "warmup" } });
  await infer(new Float32Array(size * size * 3)); // first run builds kernels; do it before "ready"
  const tReady = performance.now();
  const abs = (u: string) => new URL(u, self.location.href).href;
  void evictOtherModels([abs(msg.modelUrl), abs(msg.labelsUrl)], "itapon-archive-");

  post({
    type: "ready",
    info: {
      engine: "archive",
      modelVersion: labels.model_version,
      modelId: spec.id,
      backend: "wasm",
      threads,
      fromCache,
      loadMs: Math.round(tReady - start),
      timings: {
        fetchMs: Math.round(tFetched - start),
        sessionMs: Math.round(tSession - tFetched),
        warmupMs: Math.round(tReady - tSession),
      },
    },
  });
}

async function infer(data: Float32Array): Promise<Float32Array> {
  const size = spec!.imgsz;
  const feeds = { [session!.inputNames[0]]: new ort.Tensor("float32", data, [1, size, size, 3]) };
  const out = await session!.run(feeds);
  return out[session!.outputNames[0]].data as Float32Array;
}

async function detect(id: number, bitmap: ImageBitmap) {
  if (!session || !ctx || !input || !labels || !spec) throw new Error("Model not loaded");
  const size = spec.imgsz;
  // Stretch to the square input, as the model was trained (no letterbox).
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();

  const start = performance.now();
  const rgba = ctx.getImageData(0, 0, size, size).data;
  if (isNearlyUniform(rgba)) {
    // Nothing to classify (covered lens, plain wall): skip the model, report nothing.
    post({ type: "result", id, result: { detections: [], inferenceMs: 0 } });
    return;
  }
  rgbaToNhwc(rgba, size, input);
  const output = await infer(input);
  const top = topDetection(output, labels.class_names, minConfidence);
  post({
    type: "result",
    id,
    result: { detections: top ? [top] : [], inferenceMs: Math.round(performance.now() - start) },
  });
}

// One message at a time: ONNX Runtime doesn't support concurrent runs on one session (with
// WASM threads it can hang), the same rule as detector.worker.ts.
let queue: Promise<void> = Promise.resolve();

async function handle(msg: ToWorker) {
  try {
    if (msg.type === "load") await load(msg);
    else if (msg.type === "detect") await detect(msg.id, msg.bitmap);
  } catch (err) {
    if (msg.type === "detect") {
      try {
        msg.bitmap.close();
      } catch {
        /* already closed */
      }
    }
    post({
      type: "error",
      id: msg.type === "detect" ? msg.id : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

scope.onmessage = (event: MessageEvent<ToWorker>) => {
  queue = queue.then(() => handle(event.data));
};
