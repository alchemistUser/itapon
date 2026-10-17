// SPDX-License-Identifier: AGPL-3.0-or-later
// Fire-and-forget scan logging (Phase 13 task 5). One scan_sessions row per locked result,
// plus its detections. The server sets each detection's bin and the kiosk/institution
// context (triggers, Phase 10); RLS keeps rows private to the (anonymous) user.
"use client";

import { POSSIBLE_THRESHOLD } from "@/lib/detector/models";
import type { Detection } from "@/lib/detector/types";
import { ensureUserId, getSupabase, supabaseConfigured } from "@/lib/supabase/client";

import { enqueue, flushQueue, idbQueue, memoryQueue, type QueueStore } from "./log-queue";

const MAX_DETECTIONS = 5;

export interface ScanLogInput {
  modelVersion: string;
  backend: string;
  latencyMs: number; // scan start (first frame) → result locked
  primaryClassKey: string;
  detections: Detection[];
}

export interface LoggedScan {
  scanId: string;
  primaryDetectionId: string | null; // what "Was this right?" (Phase 20) attaches to
}

/** Everything needed to write one scan; ids are made on the device so a retry is idempotent. */
interface ScanPayload {
  id: string;
  source: "mobile" | "desktop";
  modelVersion: string;
  latencyMs: number;
  backend: string;
  detections: {
    id: string;
    class_key: string;
    category_key: string;
    confidence: number;
    bbox: Record<string, number>; // JSON column
    is_primary: boolean;
  }[];
}

function toPayload(input: ScanLogInput): ScanPayload {
  // Primary first, then other confident-enough items, one row per class.
  const seen = new Set<string>();
  const detections = [...input.detections]
    .sort((a, b) =>
      a.class_key === input.primaryClassKey ? -1 : b.class_key === input.primaryClassKey ? 1 : 0,
    )
    .filter(
      (d) => d.confidence >= POSSIBLE_THRESHOLD && !seen.has(d.class_key) && seen.add(d.class_key),
    )
    .slice(0, MAX_DETECTIONS)
    .map((d) => ({
      id: crypto.randomUUID(),
      class_key: d.class_key,
      category_key: d.default_category, // overwritten by the server trigger
      confidence: d.confidence,
      bbox: { ...d.bbox },
      is_primary: d.class_key === input.primaryClassKey,
    }));
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  return {
    id: crypto.randomUUID(),
    source: coarse ? "mobile" : "desktop", // kiosk accounts are detected server-side
    modelVersion: input.modelVersion,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    backend: input.backend,
    detections,
  };
}

const DUPLICATE = "23505"; // already written by an earlier attempt

async function write(p: ScanPayload, createdAt?: string): Promise<LoggedScan> {
  const sb = await getSupabase();
  const userId = sb ? await ensureUserId() : null;
  // No session yet and sign-in failed: almost always the network (also Wi-Fi without
  // internet, where navigator.onLine is still true). Retry later; the queue is capped.
  if (!sb || !userId) throw new Error("offline: no session");
  const { error } = await sb.from("scan_sessions").insert({
    id: p.id,
    user_id: userId,
    model_version: p.modelVersion,
    source: p.source,
    latency_ms: p.latencyMs,
    inference_backend: p.backend,
    ...(createdAt ? { created_at: createdAt } : {}),
  });
  if (error && error.code !== DUPLICATE) throw error;
  if (p.detections.length) {
    const rows = p.detections.map((d) => ({
      ...d,
      session_id: p.id,
      ...(createdAt ? { created_at: createdAt } : {}),
    }));
    const { error: detError } = await sb.from("scan_detections").insert(rows);
    if (detError && detError.code !== DUPLICATE) throw detError;
  }
  return { scanId: p.id, primaryDetectionId: p.detections.find((d) => d.is_primary)?.id ?? null };
}

/** A network problem (retry later) vs. the server saying no (drop). */
function isNetworkError(e: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = String((e as { message?: string })?.message ?? e);
  return /offline|fetch|network|load failed|timeout/i.test(msg);
}

let queue: QueueStore<ScanPayload> | null = null;
function getQueue(): QueueStore<ScanPayload> {
  queue ??= typeof indexedDB === "undefined" ? memoryQueue() : idbQueue();
  return queue;
}

/**
 * Logs a locked scan. Returns the new scan, or null if it couldn't be sent now: then it
 * waits in the offline queue (Phase 21) and goes out with flushScanLogs(). Never throws.
 */
export async function logScan(input: ScanLogInput): Promise<LoggedScan | null> {
  if (!supabaseConfigured) return null;
  const payload = toPayload(input);
  try {
    return await write(payload);
  } catch (e) {
    if (isNetworkError(e)) {
      await enqueue(getQueue(), { payload, createdAt: new Date().toISOString() }).catch(() => {});
    } else {
      console.warn("[itapon] Could not log scan.", e);
    }
    return null;
  }
}

let flushing: Promise<unknown> | null = null;

/** Sends queued scans (on start-up and when the connection returns). */
export function flushScanLogs(): Promise<unknown> {
  if (!supabaseConfigured) return Promise.resolve();
  flushing ??= flushQueue(getQueue(), async (item) => {
    try {
      await write(item.payload, item.createdAt);
      return "sent";
    } catch (e) {
      return isNetworkError(e) ? "retry" : "drop";
    }
  })
    .catch(() => {})
    .finally(() => {
      flushing = null;
    });
  return flushing;
}
