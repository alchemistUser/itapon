// SPDX-License-Identifier: AGPL-3.0-or-later
// One shared scanner per tab (Phase 12). Screens read its loading state with
// useDetectorState(); the root layout preloads it on idle so /scan is often ready on arrival.
//
// D28 (amended 2026-11-03): the archive classifier is the main scanner and is ready first.
// YOLO-World then loads in the background as a helper that can name the specific items the
// classifier has no category for (src/lib/archive-classifier/hybrid.ts). If the classifier
// can't load, YOLO-World becomes the main scanner instead.
"use client";

import { combineDetections } from "@/lib/archive-classifier/hybrid";
import { reportError } from "@/lib/monitoring";
import { useSyncExternalStore } from "react";

import { BrowserDetector } from "./client";
import { DEFAULT_MODEL_ID } from "./models";
import type { DetectResult, Engine, LoadProgress, ReadyInfo } from "./types";

export interface DetectorState {
  status: "idle" | "loading" | "ready" | "error";
  progress: LoadProgress | null;
  info: ReadyInfo | null;
  error: string | null;
  startedAt: number | null;
  /** The model being loaded or running. */
  engine: Engine | null;
  /** True when the archive classifier couldn't load and YOLO-World took over. */
  fellBack: boolean;
  /** The YOLO-World helper that names specific items: only while the classifier is the main scanner. */
  specific: "off" | "loading" | "ready" | "error";
}

const IDLE: DetectorState = {
  status: "idle",
  progress: null,
  info: null,
  error: null,
  startedAt: null,
  engine: null,
  fellBack: false,
  specific: "off",
};

let detector: BrowserDetector | null = null;
let helper: BrowserDetector | null = null;
let state: DetectorState = IDLE;
const listeners = new Set<() => void>();

function set(patch: Partial<DetectorState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

/**
 * Load a model. The archive classifier is the main scanner; if it can't load (download,
 * integrity check, unsupported browser) YOLO-World takes over, and only then.
 */
function start(engine: Engine, fellBack: boolean) {
  detector?.dispose();
  const d = new BrowserDetector(DEFAULT_MODEL_ID, engine);
  detector = d;
  set({
    status: "loading",
    progress: null,
    info: null,
    error: null,
    startedAt: fellBack ? (state.startedAt ?? Date.now()) : Date.now(),
    engine,
    fellBack,
    specific: "off",
  });
  d.load((progress) => detector === d && set({ progress }))
    .then((info) => {
      if (detector !== d) return;
      set({ status: "ready", info });
      if (engine === "archive") startHelper(d);
    })
    .catch((e: Error) => {
      if (detector !== d) return;
      reportError("detector", e); // Phase 24: real-device load failures (e.g. old iOS, low memory)
      if (engine === "archive") return start("yolo", true);
      set({ status: "error", error: e.message });
    });
}

const saveData = () => {
  const conn = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  return !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "");
};

/** Load YOLO-World in the background once the classifier is ready (not on Data Saver / 2G). */
function startHelper(main: BrowserDetector) {
  helper?.dispose();
  helper = null;
  if (saveData()) return;
  const h = new BrowserDetector(DEFAULT_MODEL_ID, "yolo");
  helper = h;
  set({ specific: "loading" });
  h.load()
    .then(() => detector === main && helper === h && set({ specific: "ready" }))
    .catch((e: Error) => {
      if (helper !== h) return;
      reportError("detector", e); // the scanner keeps working on the classifier alone
      helper = null;
      set({ specific: "error" });
    });
}

/** Start loading (no-op if already loading or ready). */
export function ensureDetector(): void {
  if (typeof window === "undefined" || state.status === "loading" || state.status === "ready") {
    return;
  }
  start("archive", false);
}

/** Throw away a failed/stuck detector and start again. */
export function retryDetector(): void {
  detector?.dispose();
  helper?.dispose();
  detector = null;
  helper = null;
  state = IDLE;
  ensureDetector();
}

/**
 * One frame. With the helper ready, both models look at it and `combineDetections` picks one
 * answer; otherwise the main model answers alone.
 */
export async function detect(source: ImageBitmapSource): Promise<DetectResult> {
  ensureDetector();
  const main = detector!;
  const h = state.engine === "archive" && state.specific === "ready" ? helper : null;
  if (!h) return main.detect(source);
  const [a, y] = await Promise.all([main.detect(source), h.detect(source).catch(() => null)]);
  const chosen = combineDetections(a.detections[0] ?? null, y?.detections ?? []);
  return {
    detections: chosen ? [chosen] : [],
    inferenceMs: Math.max(a.inferenceMs, y?.inferenceMs ?? 0),
  };
}

/** Preload on idle from any page, unless the user asked to save data. */
export function preloadDetectorWhenIdle(): () => void {
  // Network-aware (Phase 21): inference is on-device (D12), so the network only matters for
  // the one-time download (9 MB classifier + 13 MB helper). Don't start it unasked on Data
  // Saver or 2G; /scan still loads the classifier.
  if (saveData()) return () => {};
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(ensureDetector, { timeout: 4000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(ensureDetector, 1500);
  return () => window.clearTimeout(t);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDetectorState(): DetectorState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
}
