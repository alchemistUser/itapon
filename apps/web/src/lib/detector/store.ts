// SPDX-License-Identifier: AGPL-3.0-or-later
// One shared BrowserDetector per tab (Phase 12). Screens read its loading state with
// useDetectorState(); the root layout preloads it on idle so /scan is often ready on arrival.
"use client";

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
}

const IDLE: DetectorState = {
  status: "idle",
  progress: null,
  info: null,
  error: null,
  startedAt: null,
  engine: null,
  fellBack: false,
};

let detector: BrowserDetector | null = null;
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
  });
  d.load((progress) => detector === d && set({ progress }))
    .then((info) => detector === d && set({ status: "ready", info }))
    .catch((e: Error) => {
      if (detector !== d) return;
      reportError("detector", e); // Phase 24: real-device load failures (e.g. old iOS, low memory)
      if (engine === "archive") return start("yolo", true);
      set({ status: "error", error: e.message });
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
  detector = null;
  state = IDLE;
  ensureDetector();
}

export async function detect(source: ImageBitmapSource): Promise<DetectResult> {
  ensureDetector();
  return detector!.detect(source);
}

/** Preload on idle from any page, unless the user asked to save data. */
export function preloadDetectorWhenIdle(): () => void {
  // Network-aware (Phase 21): inference is on-device (D12), so the network only matters for
  // the one-time 13 MB download. Don't start it unasked on Data Saver or 2G; /scan still loads it.
  const conn = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "")) return () => {};
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
