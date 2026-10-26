// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs YOLO-World ONNX inference off the main thread (D12): download + cache the model,
// create the ONNX Runtime session, then letterbox → infer → decode for each frame.
import * as ort from "onnxruntime-web/wasm";

import { evictOtherModels, fetchJsonCached, fetchWithCache, verify } from "./model-files";
import { decodeDetections, letterboxGeometry, rgbaToChw } from "./processing";
import type { FromWorker, Label, LabelsFile, ModelSpec, ToWorker } from "./types";

const scope = self as unknown as Worker;
const post = (msg: FromWorker) => scope.postMessage(msg);

let session: ort.InferenceSession | null = null;
let labels: Label[] = [];
let spec: ModelSpec | null = null;
let minConfidence = 0.1;
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

  const labelsFile = await fetchJsonCached<LabelsFile>(msg.labelsUrl, msg.labelsSha256);
  labels = labelsFile.labels;

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
  input = new Float32Array(3 * size * size);

  const tSession = performance.now();
  post({ type: "progress", progress: { phase: "warmup" } });
  await infer(new Float32Array(3 * size * size)); // first run builds kernels; do it before "ready"
  const tReady = performance.now();
  const abs = (u: string) => new URL(u, self.location.href).href;
  void evictOtherModels([abs(msg.modelUrl), abs(msg.labelsUrl)], "itapon-world-");

  post({
    type: "ready",
    info: {
      engine: "yolo",
      modelVersion: labelsFile.model_version,
      modelId: spec.id,
      backend: "wasm",
      threads,
      fromCache,
      loadMs: Math.round(tReady - start),
      // F9-1: where startup time goes (fetch/cache read vs engine+session vs first run)
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
  const feeds = { [session!.inputNames[0]]: new ort.Tensor("float32", data, [1, 3, size, size]) };
  const out = await session!.run(feeds);
  return out[session!.outputNames[0]].data as Float32Array;
}

async function detect(id: number, bitmap: ImageBitmap) {
  if (!session || !ctx || !input || !spec) throw new Error("Model not loaded");
  const size = spec.imgsz;
  const box = letterboxGeometry(bitmap.width, bitmap.height, size);
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, box.padX, box.padY, box.width, box.height);
  const { width: srcW, height: srcH } = bitmap;
  bitmap.close();

  const start = performance.now();
  rgbaToChw(ctx.getImageData(0, 0, size, size).data, size, input);
  const output = await infer(input);
  const detections = decodeDetections(output, labels, box, srcW, srcH, minConfidence);
  post({
    type: "result",
    id,
    result: { detections, inferenceMs: Math.round(performance.now() - start) },
  });
}

// Handle messages strictly one at a time. An async onmessage would let a second "detect"
// start while the first awaits session.run(); ONNX Runtime doesn't support concurrent runs
// on one session (with WASM threads it can hang). Seen when a photo arrived mid-scan.
let queue: Promise<void> = Promise.resolve();

async function handle(msg: ToWorker) {
  try {
    if (msg.type === "load") await load(msg);
    else if (msg.type === "detect") await detect(msg.id, msg.bitmap);
  } catch (err) {
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
