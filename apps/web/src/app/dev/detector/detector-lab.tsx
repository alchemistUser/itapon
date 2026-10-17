// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BrowserDetector } from "@/lib/detector/client";
import {
  CONFIDENT_THRESHOLD,
  DEFAULT_MODEL_ID,
  MODEL_CACHE,
  MODELS,
  POSSIBLE_THRESHOLD,
} from "@/lib/detector/models";
import type { Category, Detection, LoadProgress, ReadyInfo } from "@/lib/detector/types";

// Temporary bin colours until the Phase 11 design tokens exist.
const BIN_COLOR: Record<Category, string> = {
  biodegradable: "#16a34a",
  recyclable: "#0a84ff",
  residual: "#111827",
  hazardous: "#dc2626",
};

function percentile(sorted: number[], p: number) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function tier(confidence: number) {
  if (confidence >= CONFIDENT_THRESHOLD) return "confident";
  if (confidence >= POSSIBLE_THRESHOLD) return "possibly";
  return "ignored";
}

export function DetectorLab({ samples }: { samples: string[] }) {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [ready, setReady] = useState<ReadyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [bench, setBench] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const detectorRef = useRef<BrowserDetector | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // (Re)load the detector whenever the model variant changes.
  useEffect(() => {
    const detector = new BrowserDetector(modelId);
    detectorRef.current = detector;
    let active = true; // ignore a disposed detector's late results (StrictMode double-mount)
    detector
      .load((p) => active && setProgress(p))
      .then((info) => active && setReady(info))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
      detector.dispose();
    };
  }, [modelId]);

  const run = useCallback(async (img: HTMLImageElement) => {
    const detector = detectorRef.current;
    if (!detector) return;
    setBusy(true);
    setError(null);
    try {
      const result = await detector.detect(img);
      setDetections(result.detections);
      setInferenceMs(result.inferenceMs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  // Run detection when both an image and a ready model exist.
  useEffect(() => {
    if (image && ready) void run(image);
  }, [image, ready, run]);

  // Draw the image with boxes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const g = canvas.getContext("2d")!;
    g.drawImage(image, 0, 0);
    const lw = Math.max(2, canvas.width / 200);
    g.font = `${Math.max(12, canvas.width / 30)}px sans-serif`;
    for (const d of detections) {
      if (d.confidence < POSSIBLE_THRESHOLD) continue;
      const { x1, y1, x2, y2 } = d.bbox;
      const color = BIN_COLOR[d.default_category];
      g.strokeStyle = color;
      g.lineWidth = lw;
      g.setLineDash(d.confidence >= CONFIDENT_THRESHOLD ? [] : [lw * 3, lw * 2]);
      g.strokeRect(
        x1 * canvas.width,
        y1 * canvas.height,
        (x2 - x1) * canvas.width,
        (y2 - y1) * canvas.height,
      );
      const text = `${d.class_key} ${(d.confidence * 100).toFixed(0)}%`;
      const tw = g.measureText(text).width + 8;
      g.fillStyle = color;
      g.fillRect(x1 * canvas.width, y1 * canvas.height, tw, parseInt(g.font) + 6);
      g.fillStyle = "#fff";
      g.fillText(text, x1 * canvas.width + 4, y1 * canvas.height + parseInt(g.font));
    }
  }, [image, detections]);

  function openImage(src: string) {
    const img = new Image();
    img.onload = () => {
      setBench(null);
      setImage(img);
    };
    img.onerror = () => setError(`Could not open image ${src}`);
    img.src = src;
  }

  async function benchmark() {
    const detector = detectorRef.current;
    if (!detector || !image) return;
    setBusy(true);
    const times: number[] = [];
    for (let i = 0; i < 20; i++) times.push((await detector.detect(image)).inferenceMs);
    times.sort((a, b) => a - b);
    setBench(
      `20 runs: p50 ${percentile(times, 0.5)} ms · p95 ${percentile(times, 0.95)} ms · max ${times.at(-1)} ms`,
    );
    setBusy(false);
  }

  async function clearCache() {
    await caches.delete(MODEL_CACHE);
    location.reload();
  }

  const pct =
    progress?.phase === "download" && progress.total
      ? Math.min(100, Math.round(((progress.loaded ?? 0) / progress.total) * 100))
      : null;

  return (
    <main className="flex w-full flex-1 flex-col gap-4 bg-slate-50 px-4 py-6 text-slate-900 sm:px-[max(1rem,calc(50%-24rem))]">
      <header>
        <h1 className="text-2xl font-bold">Detector test</h1>
        <p className="text-sm text-slate-500">
          In-browser YOLO-World (ONNX Runtime Web). Developer page for Phase 9 benchmarks.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm">
          Model
          <select
            className="rounded-md border border-slate-300 px-2 py-1"
            value={modelId}
            onChange={(e) => {
              setReady(null);
              setError(null);
              setProgress(null);
              setModelId(e.target.value);
            }}
          >
            {Object.values(MODELS).map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} (~{m.approxMB} MB)
              </option>
            ))}
          </select>
        </label>
        <button className="text-sm text-blue-600 underline" onClick={clearCache}>
          Clear model cache
        </button>

        <div className="w-full text-sm" role="status" aria-live="polite">
          {error ? (
            <p className="text-red-600">Error: {error}</p>
          ) : ready ? (
            <p data-testid="ready">
              ✅ Ready · {ready.modelVersion} · {ready.modelId} · {ready.backend} × {ready.threads}{" "}
              thread(s) · loaded in {ready.loadMs} ms{" "}
              {ready.fromCache ? "(from cache)" : "(downloaded)"}
            </p>
          ) : progress?.phase === "download" ? (
            <div>
              <p>
                Downloading scanner… {((progress.loaded ?? 0) / 1e6).toFixed(1)} of{" "}
                {((progress.total ?? 0) / 1e6).toFixed(0)} MB
              </p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-200">
                <div className="h-full bg-blue-500" style={{ width: `${pct ?? 0}%` }} />
              </div>
            </div>
          ) : (
            <p>{progress?.phase === "warmup" ? "Warming up…" : "Getting ready…"}</p>
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
          Choose photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) openImage(URL.createObjectURL(file));
            }}
          />
        </label>
        {samples.map((s) => (
          <button
            key={s}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            onClick={() => openImage(s)}
          >
            {s.split("/").pop()}
          </button>
        ))}
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
          disabled={!image || !ready || busy}
          onClick={benchmark}
        >
          Benchmark ×20
        </button>
      </section>

      {image && (
        <section className="flex flex-col gap-3">
          <canvas ref={canvasRef} className="h-auto w-full rounded-xl bg-slate-200" />
          <p className="text-sm text-slate-600" data-testid="timing">
            {busy ? "Detecting…" : inferenceMs !== null ? `Inference ${inferenceMs} ms` : ""}
            {bench ? ` · ${bench}` : ""}
          </p>
          <table className="w-full text-left text-sm" data-testid="detections">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1">Item</th>
                <th>Bin</th>
                <th>Confidence</th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {detections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-2 text-slate-400">
                    No detections
                  </td>
                </tr>
              ) : (
                detections.map((d, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="py-1 font-medium">{d.class_key}</td>
                    <td style={{ color: BIN_COLOR[d.default_category] }}>{d.default_category}</td>
                    <td>{d.confidence.toFixed(3)}</td>
                    <td>{tier(d.confidence)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
