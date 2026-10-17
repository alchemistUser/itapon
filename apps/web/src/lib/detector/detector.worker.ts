// SPDX-License-Identifier: AGPL-3.0-or-later
// Runs YOLO-World ONNX inference off the main thread (D12): download + cache the model,
// create the ONNX Runtime session, then letterbox → infer → decode for each frame.
import * as ort from "onnxruntime-web/wasm";

import { MODEL_CACHE } from "./models";
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

async function fetchWithCache(url: string, onProgress?: (loaded: number, total?: number) => void) {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(MODEL_CACHE);
    const hit = await cache.match(url);
    if (hit) return { buffer: await hit.arrayBuffer(), fromCache: true };
  } catch {
    cache = null; // Cache API unavailable (private mode, http): just download
  }

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url}`);
  const total = Number(res.headers.get("content-length")) || undefined;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  if (cache) {
    await cache.put(url, new Response(bytes, { headers: res.headers })).catch(() => {});
  }
  return { buffer: bytes.buffer, fromCache: false };
}

async function load(msg: Extract<ToWorker, { type: "load" }>) {
  const start = performance.now();
  spec = msg.model;
  minConfidence = msg.minConfidence;

  ort.env.wasm.wasmPaths = msg.wasmPath;
  // Threads need cross-origin isolation (COOP/COEP headers on /scan and /dev).
  const threads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  ort.env.wasm.numThreads = threads;

  const labelsRes = await fetch(msg.labelsUrl);
  if (!labelsRes.ok) throw new Error(`Labels download failed (${labelsRes.status})`);
  const labelsFile = (await labelsRes.json()) as LabelsFile;
  labels = labelsFile.labels;

  const { buffer, fromCache } = await fetchWithCache(msg.modelUrl, (loaded, total) =>
    post({
      type: "progress",
      progress: { phase: "download", loaded, total: total ?? spec!.approxMB * 1e6 },
    }),
  );

  post({ type: "progress", progress: { phase: "init" } });
  session = await ort.InferenceSession.create(new Uint8Array(buffer), {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });

  const size = spec.imgsz;
  canvas = new OffscreenCanvas(size, size);
  ctx = canvas.getContext("2d", { willReadFrequently: true });
  input = new Float32Array(3 * size * size);

  post({ type: "progress", progress: { phase: "warmup" } });
  await infer(new Float32Array(3 * size * size)); // first run builds kernels; do it before "ready"

  post({
    type: "ready",
    info: {
      modelVersion: labelsFile.model_version,
      modelId: spec.id,
      backend: "wasm",
      threads,
      fromCache,
      loadMs: Math.round(performance.now() - start),
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

scope.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
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
};
