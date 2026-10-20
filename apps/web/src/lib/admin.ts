// SPDX-License-Identifier: AGPL-3.0-or-later
// Admin data access (Phase 19). Everything runs in the browser under RLS: an admin sees
// only scans and devices of their own institution; anyone else gets nothing back.
"use client";

import { useEffect, useState } from "react";

import type { AnalyticsScan, FeedbackRow } from "@/lib/analytics";
import type { Category } from "@/lib/detector/types";
import { getSupabase } from "@/lib/supabase/client";

export interface AdminContext {
  loading: boolean;
  isAdmin: boolean;
  institution: { id: string; name: string } | null;
}

export function useAdminContext(): AdminContext {
  const [ctx, setCtx] = useState<AdminContext>({
    loading: true,
    isAdmin: false,
    institution: null,
  });
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sb = await getSupabase();
      const uid = sb ? (await sb.auth.getSession()).data.session?.user.id : undefined;
      if (!sb || !uid)
        return !cancelled && setCtx({ loading: false, isAdmin: false, institution: null });
      const { data: prof } = await sb
        .from("profiles")
        .select("role, institution_id")
        .eq("id", uid)
        .maybeSingle();
      let institution: AdminContext["institution"] = null;
      if (prof?.institution_id) {
        const { data: inst } = await sb
          .from("institutions")
          .select("id, name")
          .eq("id", prof.institution_id)
          .maybeSingle();
        institution = inst ?? null;
      }
      if (!cancelled)
        setCtx({ loading: false, isAdmin: prof?.role === "admin" && !!institution, institution });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return ctx;
}

const PAGE = 1000; // PostgREST default max rows per request
const MAX_ROWS = 20_000;

/** Institution scans with detections between two Manila dates (inclusive). */
export async function fetchInstitutionScans(
  fromDay: string,
  toDay: string,
): Promise<{ scans: AnalyticsScan[]; truncated: boolean }> {
  const sb = await getSupabase();
  if (!sb) return { scans: [], truncated: false };
  const from = new Date(`${fromDay}T00:00:00+08:00`).toISOString();
  const to = new Date(`${toDay}T23:59:59.999+08:00`).toISOString();
  const scans: AnalyticsScan[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const { data, error } = await sb
      .from("scan_sessions")
      .select(
        "id, created_at, device_id, source, model_version, latency_ms, inference_backend, scan_detections(class_key, category_key, confidence, is_primary)",
      )
      .not("institution_id", "is", null)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      scans.push({
        id: r.id,
        createdAt: r.created_at,
        deviceId: r.device_id,
        source: r.source,
        modelVersion: r.model_version,
        latencyMs: r.latency_ms,
        backend: r.inference_backend,
        detections: (r.scan_detections ?? []).map((d) => ({
          classKey: d.class_key,
          category: d.category_key as Category,
          confidence: d.confidence,
          isPrimary: d.is_primary,
        })),
      });
    }
    if ((data ?? []).length < PAGE) return { scans, truncated: false };
  }
  return { scans, truncated: true };
}

export interface AdminDevice {
  id: string;
  label: string;
  locationNote: string | null;
  binOrder: Category[];
  linked: boolean;
}

export async function fetchDevices(): Promise<AdminDevice[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("devices")
    .select("id, label, location_note, bin_order, kiosk_user_id")
    .order("label");
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    label: d.label,
    locationNote: d.location_note,
    binOrder: d.bin_order as Category[],
    linked: !!d.kiosk_user_id,
  }));
}

export async function registerKiosk(input: {
  email: string;
  label: string;
  location?: string;
  binOrder: Category[];
}): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Not available" };
  const { error } = await sb.rpc("admin_register_kiosk", {
    p_email: input.email,
    p_label: input.label,
    p_location: input.location ?? undefined,
    p_bin_order: input.binOrder,
  });
  return error ? { error: error.message } : {};
}

export async function updateDevice(
  id: string,
  patch: { label?: string; location_note?: string | null; bin_order?: Category[] },
): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Not available" };
  const { error } = await sb.from("devices").update(patch).eq("id", id);
  return error ? { error: error.message } : {};
}

/** Feedback on the institution's scans (RLS: admins see only their own institution's). */
export async function fetchInstitutionFeedback(
  fromDay: string,
  toDay: string,
): Promise<FeedbackRow[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const from = new Date(`${fromDay}T00:00:00+08:00`).toISOString();
  const to = new Date(`${toDay}T23:59:59.999+08:00`).toISOString();
  const out: FeedbackRow[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const { data, error } = await sb
      .from("feedback")
      .select(
        "id, created_at, is_correct, corrected_class_key, model_version, image_path, review_status, reviewed_class_key, scan_detections!inner(class_key, category_key, scan_sessions!inner(device_id, institution_id))",
      )
      .not("scan_detections.scan_sessions.institution_id", "is", null)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      const det = r.scan_detections;
      out.push({
        id: r.id,
        createdAt: r.created_at,
        deviceId: det.scan_sessions.device_id,
        predictedClassKey: det.class_key,
        predictedCategory: det.category_key as Category,
        isCorrect: r.is_correct,
        correctedClassKey: r.corrected_class_key,
        modelVersion: r.model_version,
        imagePath: r.image_path,
        reviewStatus: r.review_status as FeedbackRow["reviewStatus"],
        reviewedClassKey: r.reviewed_class_key,
      });
    }
    if ((data ?? []).length < PAGE) break;
  }
  return out;
}

/** Short-lived links to shared feedback photos (private bucket). */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const sb = await getSupabase();
  if (!sb || !paths.length) return {};
  const { data } = await sb.storage.from("training-images").createSignedUrls(paths, 600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

export async function reviewFeedback(
  id: string,
  status: FeedbackRow["reviewStatus"],
  classKey: string | null,
): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Not available" };
  const { error } = await sb.rpc("admin_review_feedback", {
    p_id: id,
    p_status: status,
    p_class_key: classKey ?? undefined,
  });
  return error ? { error: error.message } : {};
}

/** Register the kiosk that shows this 6-digit pairing code (Phase 25, no email needed). */
export async function registerKioskByCode(input: {
  code: string;
  label: string;
  location?: string;
  binOrder: Category[];
}): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Not available" };
  const { error } = await sb.rpc("admin_register_kiosk_code", {
    p_code: input.code.replace(/\D/g, ""),
    p_label: input.label,
    p_location: input.location ?? undefined,
    p_bin_order: input.binOrder,
  });
  return error ? { error: error.message } : {};
}

export interface KioskUptime {
  hours: number; // online time (5-minute heartbeats) in the period
  days: number;
  lastSeen: string | null;
}

/** Online time per kiosk between two Manila dates (heartbeats; RLS: own institution). */
export async function fetchKioskUptime(
  fromDay: string,
  toDay: string,
): Promise<Record<string, KioskUptime>> {
  const sb = await getSupabase();
  if (!sb) return {};
  const { data, error } = await sb.rpc("kiosk_uptime", { p_from: fromDay, p_to: toDay });
  if (error) throw error;
  const out: Record<string, KioskUptime> = {};
  for (const r of data ?? []) {
    out[r.device_id] = {
      hours: Math.round((Number(r.buckets) * 5) / 6) / 10,
      days: Number(r.days),
      lastSeen: r.last_seen,
    };
  }
  return out;
}

export interface LibraryCount {
  slug: string;
  event: "view" | "chooser" | "idea_plan" | "idea_done";
  institution: number;
  everyone: number;
}

/** Library use per item and event (Phase 30): your institution and all users; no ids. */
export async function fetchLibraryCounts(fromDay: string, toDay: string): Promise<LibraryCount[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("library_event_counts", { p_from: fromDay, p_to: toDay });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    slug: r.item_slug,
    event: r.event as LibraryCount["event"],
    institution: Number(r.institution),
    everyone: Number(r.everyone),
  }));
}
