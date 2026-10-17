// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// On-device soak test (Phase 23 task 6): scan continuously for N minutes with the real
// camera and the production scan loop, sampling fps, inference time, JS heap and battery
// every 10 s. Results stay on the device; download the CSV for docs/qa/performance.md.
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ensureDetector, useDetectorState } from "@/lib/detector/store";
import { useCamera } from "@/lib/scan/use-camera";
import { useScanLoop } from "@/lib/scan/use-scan-loop";

interface Sample {
  t: number; // seconds since start
  fps: number;
  inferMs: number; // median of the last window
  heapMB: number | null; // Chrome only
  battery: number | null; // 0-100, where supported
  charging: boolean | null;
}

type Battery = { level: number; charging: boolean };

const SAMPLE_EVERY_MS = 10_000;

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function SoakTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camera = useCamera(videoRef);
  const det = useDetectorState();
  const [minutes, setMinutes] = useState(10);
  const [running, setRunning] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const startRef = useRef(0);
  const inferRef = useRef<number[]>([]);
  const batteryRef = useRef<Battery | null>(null);

  useEffect(() => ensureDetector(), []);

  const loop = useScanLoop(videoRef, {
    enabled: running && det.status === "ready" && camera.status === "live",
    onLock: () => false, // never lock: keep the detector busy the whole time
  });

  // collect per-frame inference times
  useEffect(() => {
    if (running && loop.frame) inferRef.current.push(loop.frame.inferenceMs);
  }, [running, loop.frame]);

  const fpsRef = useRef(0);
  useEffect(() => {
    fpsRef.current = loop.fps;
  }, [loop.fps]);

  const stop = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (!running) return;
    const nav = navigator as Navigator & { getBattery?: () => Promise<Battery> };
    void nav.getBattery?.().then((b) => (batteryRef.current = b));
    const id = window.setInterval(() => {
      const t = Math.round((performance.now() - startRef.current) / 1000);
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      const b = batteryRef.current;
      const s: Sample = {
        t,
        fps: Math.round(fpsRef.current * 10) / 10,
        inferMs: Math.round(median(inferRef.current)),
        heapMB: mem ? Math.round(mem.usedJSHeapSize / 1e5) / 10 : null,
        battery: b ? Math.round(b.level * 100) : null,
        charging: b ? b.charging : null,
      };
      inferRef.current = [];
      setSamples((xs) => [...xs, s]);
      if (t >= minutes * 60) stop();
    }, SAMPLE_EVERY_MS);
    return () => window.clearInterval(id);
  }, [running, minutes, stop]);

  function start() {
    startRef.current = performance.now();
    inferRef.current = [];
    setSamples([]);
    setRunning(true);
  }

  function download() {
    const head = "t_s,fps,infer_ms_p50,heap_mb,battery_pct,charging";
    const rows = samples.map((s) =>
      [s.t, s.fps, s.inferMs, s.heapMB ?? "", s.battery ?? "", s.charging ?? ""].join(","),
    );
    const blob = new Blob([[head, ...rows].join("\n") + "\n"], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `itapon-soak-${new Date().toISOString().slice(0, 16)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const first = samples[0];
  const last = samples.at(-1);
  const heapGrowth =
    first?.heapMB != null && last?.heapMB != null ? last.heapMB - first.heapMB : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-ink">Soak test</h1>
      <p className="text-sm text-ink-3">
        Continuous scanning for a fixed time (Phase 23). Point the camera at a few items, keep the
        screen on, and don&apos;t switch apps. Detector: {det.status}
        {det.info ? ` · ${det.info.modelId} · ${det.info.threads} threads` : ""} · camera:{" "}
        {camera.status}
      </p>
      <video
        ref={videoRef}
        playsInline
        muted
        className="aspect-video w-full rounded-card bg-ink object-cover"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Minutes
          <input
            type="number"
            min={1}
            max={120}
            value={minutes}
            disabled={running}
            onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 10))}
            className="h-10 w-20 rounded-control border border-line px-2"
          />
        </label>
        {running ? (
          <Button variant="outline" onClick={stop}>
            Stop
          </Button>
        ) : (
          <Button onClick={start} disabled={det.status !== "ready" || camera.status !== "live"}>
            Start
          </Button>
        )}
        <Button variant="outline" onClick={download} disabled={!samples.length}>
          Download CSV
        </Button>
        <span className="text-sm text-ink-3" aria-live="polite">
          {running ? `Running… ${last?.t ?? 0} s · ${loop.fps} fps` : samples.length ? "Done" : ""}
        </span>
      </div>
      {samples.length ? (
        <p className="text-sm text-ink">
          {samples.length} samples · median fps {median(samples.map((s) => s.fps))} · median
          inference {median(samples.map((s) => s.inferMs))} ms
          {heapGrowth !== null ? ` · heap ${first!.heapMB} → ${last!.heapMB} MB` : ""}
          {first?.battery != null && last?.battery != null
            ? ` · battery ${first.battery}% → ${last.battery}%`
            : ""}
        </p>
      ) : null}
      <table className="text-left text-xs tabular-nums">
        <thead>
          <tr className="text-ink-3">
            <th className="pr-4">t (s)</th>
            <th className="pr-4">fps</th>
            <th className="pr-4">infer p50 (ms)</th>
            <th className="pr-4">heap (MB)</th>
            <th>battery</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr key={s.t}>
              <td className="pr-4">{s.t}</td>
              <td className="pr-4">{s.fps}</td>
              <td className="pr-4">{s.inferMs}</td>
              <td className="pr-4">{s.heapMB ?? "–"}</td>
              <td>{s.battery == null ? "–" : `${s.battery}%${s.charging ? " ⚡" : ""}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
