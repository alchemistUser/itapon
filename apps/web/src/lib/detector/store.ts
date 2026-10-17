// SPDX-License-Identifier: AGPL-3.0-or-later
// One shared BrowserDetector per tab (Phase 12). Screens read its loading state with
// useDetectorState(); the root layout preloads it on idle so /scan is often ready on arrival.
"use client";

import { useSyncExternalStore } from "react";

import { BrowserDetector } from "./client";
import type { DetectResult, LoadProgress, ReadyInfo } from "./types";

export interface DetectorState {
  status: "idle" | "loading" | "ready" | "error";
  progress: LoadProgress | null;
  info: ReadyInfo | null;
  error: string | null;
  startedAt: number | null;
}

const IDLE: DetectorState = {
  status: "idle",
  progress: null,
  info: null,
  error: null,
  startedAt: null,
};

let detector: BrowserDetector | null = null;
let state: DetectorState = IDLE;
const listeners = new Set<() => void>();

function set(patch: Partial<DetectorState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

/** Start loading (no-op if already loading or ready). */
export function ensureDetector(): void {
  if (typeof window === "undefined" || state.status === "loading" || state.status === "ready") {
    return;
  }
  detector?.dispose();
  const d = new BrowserDetector();
  detector = d;
  set({ status: "loading", progress: null, info: null, error: null, startedAt: Date.now() });
  d.load((progress) => detector === d && set({ progress }))
    .then((info) => detector === d && set({ status: "ready", info }))
    .catch((e: Error) => detector === d && set({ status: "error", error: e.message }));
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
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return () => {};
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
