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
import type { DetectResult, Detection, Engine, LoadProgress, ReadyInfo } from "./types";

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
      if (engine === "archive" && wantHelper) startHelper(d);
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

/**
 * The helper is only worth its 13 MB and CPU on the scanner itself: the idle preload from other
 * pages loads the classifier alone, and the scanner screens ask for the helper here.
 */
let wantHelper = false;
export function ensureHelper(): void {
  wantHelper = true;
  if (detector && state.status === "ready" && state.engine === "archive" && !helper) {
    startHelper(detector);
  }
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
  helperLatest = null;
  state = IDLE;
  ensureDetector();
}

/** How old the helper's latest look may be and still count for the current frame. */
const HELPER_MAX_AGE_MS = 1500;
let helperLatest: { detections: Detection[]; at: number } | null = null;
let helperBusy = false;

/**
 * One frame. The classifier (fast) answers every frame. The YOLO helper (several times slower)
 * runs in the background on whichever frame finds it idle, and `combineDetections` uses its
 * latest look if it is recent: the scan loop never waits for it.
 */
export async function detect(source: ImageBitmapSource): Promise<DetectResult> {
  ensureDetector();
  const main = detector!;
  const h = state.engine === "archive" && state.specific === "ready" ? helper : null;
  if (!h) return main.detect(source);
  if (!helperBusy) {
    helperBusy = true;
    h.detect(source)
      .then((r) => (helperLatest = { detections: r.detections, at: performance.now() }))
      .catch(() => (helperLatest = null)) // the classifier alone keeps answering
      .finally(() => (helperBusy = false));
  }
  const a = await main.detect(source);
  const recent = helperLatest && performance.now() - helperLatest.at < HELPER_MAX_AGE_MS;
  const chosen = combineDetections(a.detections[0] ?? null, recent ? helperLatest!.detections : []);
  return { detections: chosen ? [chosen] : [], inferenceMs: a.inferenceMs };
}

/** Preload on idle from any page, unless the user asked to save data. */
export function preloadDetectorWhenIdle(): () => void {
  // Network-aware (Phase 21): inference is on-device (D12), so the network only matters for
  // the one-time download (9 MB classifier here; the 13 MB helper only loads on the scanner).
  // Don't start it unasked on Data Saver or 2G; /scan still loads the classifier.
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
