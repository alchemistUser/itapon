// SPDX-License-Identifier: AGPL-3.0-or-later
// The most recent locked scan, for the "What to do next" pages (Phase 14).
// Thumbnails are cropped on the device and kept only in this tab (memory + sessionStorage
// so a reload still works). Nothing here is uploaded (task 5; Phase 20 adds opt-in sharing).
"use client";

import { useSyncExternalStore } from "react";

import type { Detection } from "@/lib/detector/types";

import { aggregateDetections, type PlanEntry } from "./plan";

export interface LastScan {
  entries: PlanEntry[];
  lockedKey: string;
  thumbs: Record<string, string>; // classKey → small JPEG data URL
  at: number; // epoch ms
}

const SLOT = "itapon-last-scan";
const THUMB_PX = 160;

let current: LastScan | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = sessionStorage.getItem(SLOT);
    if (raw) current = JSON.parse(raw) as LastScan;
  } catch {
    current = null;
  }
}

/** Square-ish crop of each item's box (with a little margin) from the captured frame. */
function cropThumbs(
  source: CanvasImageSource,
  width: number,
  height: number,
  entries: PlanEntry[],
): Record<string, string> {
  const out: Record<string, string> = {};
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = THUMB_PX;
  const g = canvas.getContext("2d");
  if (!g || !width || !height) return out;
  for (const e of entries) {
    const bw = (e.bbox.x2 - e.bbox.x1) * width;
    const bh = (e.bbox.y2 - e.bbox.y1) * height;
    const side = Math.min(Math.max(bw, bh) * 1.15, width, height);
    const cx = ((e.bbox.x1 + e.bbox.x2) / 2) * width;
    const cy = ((e.bbox.y1 + e.bbox.y2) / 2) * height;
    const sx = Math.min(Math.max(0, cx - side / 2), width - side);
    const sy = Math.min(Math.max(0, cy - side / 2), height - side);
    if (side < 8) continue;
    g.drawImage(source, sx, sy, side, side, 0, 0, THUMB_PX, THUMB_PX);
    try {
      out[e.classKey] = canvas.toDataURL("image/jpeg", 0.75);
    } catch {
      /* tainted canvas: skip thumbnails */
    }
  }
  return out;
}

export function saveLastScan(input: {
  detections: Detection[];
  lockedKey: string;
  source: CanvasImageSource | null;
  width: number;
  height: number;
}) {
  const entries = aggregateDetections(input.detections);
  if (!entries.some((e) => e.classKey === input.lockedKey)) return;
  const thumbs = input.source ? cropThumbs(input.source, input.width, input.height, entries) : {};
  current = { entries, lockedKey: input.lockedKey, thumbs, at: Date.now() };
  loaded = true;
  try {
    sessionStorage.setItem(SLOT, JSON.stringify(current));
  } catch {
    /* quota / private mode: memory only */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLastScan(): LastScan | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return current;
    },
    () => null,
  );
}
