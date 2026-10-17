// SPDX-License-Identifier: AGPL-3.0-or-later
// Scan history (Phase 16): the signed-in (or anonymous) user's own scans, newest first.
// RLS returns only the caller's rows; admins' institution-wide reads come in Phase 19.
"use client";

import type { Category } from "@/lib/detector/types";

import { getSupabase } from "./supabase/client";

export const HISTORY_PAGE_SIZE = 20;

export interface HistoryDetection {
  classKey: string;
  category: Category;
  confidence: number;
  isPrimary: boolean;
}

export interface HistoryScan {
  id: string;
  createdAt: string;
  source: string;
  detections: HistoryDetection[];
}

export async function fetchHistory(page: number): Promise<{ scans: HistoryScan[]; more: boolean }> {
  const sb = getSupabase();
  if (!sb) return { scans: [], more: false };
  const { data: auth } = await sb.auth.getSession();
  if (!auth.session) return { scans: [], more: false }; // no account yet → no history
  const from = page * HISTORY_PAGE_SIZE;
  const { data, error } = await sb
    .from("scan_sessions")
    .select(
      "id, created_at, source, scan_detections(class_key, category_key, confidence, is_primary)",
    )
    .order("created_at", { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE); // one extra row tells us if there's more
  if (error) throw error;
  const rows = data ?? [];
  return {
    more: rows.length > HISTORY_PAGE_SIZE,
    scans: rows.slice(0, HISTORY_PAGE_SIZE).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      source: r.source,
      detections: (r.scan_detections ?? [])
        .map((d) => ({
          classKey: d.class_key,
          category: d.category_key as Category,
          confidence: d.confidence,
          isPrimary: d.is_primary,
        }))
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.confidence - a.confidence),
    })),
  };
}

/** "Delete my data": scans + feedback rows (RPC) and any shared training photos. */
export async function deleteMyData(): Promise<{ scans: number; feedback: number; photos: number }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Not available");
  const { data: auth } = await sb.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { scans: 0, feedback: 0, photos: 0 };

  let photos = 0;
  const bucket = sb.storage.from("training-images");
  const { data: files } = await bucket.list(uid, { limit: 1000 });
  if (files?.length) {
    const paths = files.map((f) => `${uid}/${f.name}`);
    const { error } = await bucket.remove(paths);
    if (!error) photos = paths.length;
  }
  const { data, error } = await sb.rpc("delete_my_data");
  if (error) throw error;
  const row = data?.[0];
  return {
    scans: Number(row?.scans_deleted ?? 0),
    feedback: Number(row?.feedback_deleted ?? 0),
    photos,
  };
}
