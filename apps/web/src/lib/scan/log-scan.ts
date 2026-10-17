// SPDX-License-Identifier: AGPL-3.0-or-later
// Fire-and-forget scan logging (Phase 13 task 5). One scan_sessions row per locked result,
// plus its detections. The server sets each detection's bin and the kiosk/institution
// context (triggers, Phase 10); RLS keeps rows private to the (anonymous) user.
"use client";

import { POSSIBLE_THRESHOLD } from "@/lib/detector/models";
import type { Detection } from "@/lib/detector/types";
import { ensureUserId, getSupabase } from "@/lib/supabase/client";

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

/** Returns the new scan, or null if logging is unavailable. Never throws. */
export async function logScan(input: ScanLogInput): Promise<LoggedScan | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const userId = await ensureUserId();
    if (!userId) return null;

    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const { data: session, error } = await sb
      .from("scan_sessions")
      .insert({
        user_id: userId,
        model_version: input.modelVersion,
        source: coarse ? "mobile" : "desktop", // kiosk accounts are detected server-side
        latency_ms: Math.max(0, Math.round(input.latencyMs)),
        inference_backend: input.backend,
      })
      .select("id")
      .single();
    if (error) throw error;

    // Primary first, then other confident-enough items, one row per class.
    const seen = new Set<string>();
    const rows = [...input.detections]
      .sort((a, b) =>
        a.class_key === input.primaryClassKey ? -1 : b.class_key === input.primaryClassKey ? 1 : 0,
      )
      .filter(
        (d) =>
          d.confidence >= POSSIBLE_THRESHOLD && !seen.has(d.class_key) && seen.add(d.class_key),
      )
      .slice(0, MAX_DETECTIONS)
      .map((d) => ({
        session_id: session.id,
        class_key: d.class_key,
        category_key: d.default_category, // overwritten by the server trigger
        confidence: d.confidence,
        bbox: { ...d.bbox },
        is_primary: d.class_key === input.primaryClassKey,
      }));
    let primaryDetectionId: string | null = null;
    if (rows.length) {
      const { data: inserted, error: detError } = await sb
        .from("scan_detections")
        .insert(rows)
        .select("id, is_primary");
      if (detError) throw detError;
      primaryDetectionId = inserted?.find((d) => d.is_primary)?.id ?? null;
    }
    return { scanId: session.id, primaryDetectionId };
  } catch (e) {
    console.warn("[itapon] Could not log scan (it still works offline).", e);
    return null;
  }
}
