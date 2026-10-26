// SPDX-License-Identifier: AGPL-3.0-or-later
// Main-thread wrapper around the detector worker. Usage:
//   const d = new BrowserDetector();
//   await d.load(progress => …);
//   const { detections } = await d.detect(videoOrImage);
import {
  ARCHIVE_LABELS_FILE,
  ARCHIVE_MIN_CONFIDENCE,
  ARCHIVE_MODEL,
  DEFAULT_MODEL_ID,
  LABELS_FILE,
  MIN_CONFIDENCE,
  MODELS,
  WASM_PATH,
  archiveLabelsUrl,
  archiveModelUrl,
  expectedArchiveSha256,
  expectedSha256,
  labelsUrl,
  modelUrl,
} from "./models";
import type {
  DetectResult,
  Engine,
  FromWorker,
  LoadProgress,
  ModelSpec,
  ReadyInfo,
  ToWorker,
} from "./types";

type Pending = { resolve: (r: DetectResult) => void; reject: (e: Error) => void };

export class BrowserDetector {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private loadPromise: Promise<ReadyInfo> | null = null;
  private onProgress?: (p: LoadProgress) => void;
  private loadHandlers?: { resolve: (i: ReadyInfo) => void; reject: (e: Error) => void };

  /**
   * `engine` "archive" runs the archive image classifier (the main scanner); "yolo" runs
   * YOLO-World (the fallback, and what the dev tools use). `modelId` picks the YOLO variant.
   */
  constructor(
    private readonly modelId: string = DEFAULT_MODEL_ID,
    readonly engine: Engine = "yolo",
  ) {
    if (engine === "yolo" && !MODELS[modelId]) throw new Error(`Unknown model ${modelId}`);
    this.worker =
      engine === "archive"
        ? new Worker(new URL("./archive-classifier.worker.ts", import.meta.url), { type: "module" })
        : new Worker(new URL("./detector.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => this.handle(e.data);
    this.worker.onerror = (e) => this.failAll(new Error(e.message || "Detector worker crashed"));
  }

  load(onProgress?: (p: LoadProgress) => void): Promise<ReadyInfo> {
    this.onProgress = onProgress;
    this.loadPromise ??= new Promise<ReadyInfo>((resolve, reject) => {
      this.loadHandlers = { resolve, reject };
      this.send(this.loadMessage());
    });
    return this.loadPromise;
  }

  private loadMessage(): Extract<ToWorker, { type: "load" }> {
    if (this.engine === "archive") {
      const model: ModelSpec = ARCHIVE_MODEL;
      return {
        type: "load",
        model,
        modelUrl: archiveModelUrl(),
        labelsUrl: archiveLabelsUrl(),
        modelSha256: expectedArchiveSha256(model.file),
        labelsSha256: expectedArchiveSha256(ARCHIVE_LABELS_FILE),
        wasmPath: WASM_PATH,
        minConfidence: ARCHIVE_MIN_CONFIDENCE,
      };
    }
    const model = MODELS[this.modelId];
    return {
      type: "load",
      model,
      modelUrl: modelUrl(model),
      labelsUrl: labelsUrl(),
      modelSha256: expectedSha256(model.file),
      labelsSha256: expectedSha256(LABELS_FILE),
      wasmPath: WASM_PATH,
      minConfidence: MIN_CONFIDENCE,
    };
  }

  async detect(source: ImageBitmapSource): Promise<DetectResult> {
    await this.load();
    const bitmap = await createImageBitmap(source);
    const id = this.nextId++;
    return new Promise<DetectResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ type: "detect", id, bitmap }, [bitmap]);
    });
  }

  dispose(): void {
    this.failAll(new Error("Detector disposed"));
    this.worker.terminate();
  }

  private send(msg: ToWorker, transfer: Transferable[] = []) {
    this.worker.postMessage(msg, transfer);
  }

  private handle(msg: FromWorker) {
    switch (msg.type) {
      case "progress":
        this.onProgress?.(msg.progress);
        break;
      case "ready":
        this.loadHandlers?.resolve(msg.info);
        break;
      case "result":
        this.pending.get(msg.id)?.resolve(msg.result);
        this.pending.delete(msg.id);
        break;
      case "error": {
        const err = new Error(msg.message);
        if (msg.id === undefined) {
          this.loadHandlers?.reject(err);
          this.loadPromise = null; // allow Retry
        } else {
          this.pending.get(msg.id)?.reject(err);
          this.pending.delete(msg.id);
        }
        break;
      }
    }
  }

  private failAll(err: Error) {
    this.loadHandlers?.reject(err);
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}
