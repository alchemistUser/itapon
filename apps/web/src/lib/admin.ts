// SPDX-License-Identifier: AGPL-3.0-or-later
// Admin data access (Phase 19). Everything runs in the browser under RLS: an admin sees
// only scans and devices of their own institution; anyone else gets nothing back.
"use client";

import { useEffect, useState } from "react";

import type { AnalyticsScan } from "@/lib/analytics";
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
      const sb = getSupabase();
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
  const sb = getSupabase();
  if (!sb) return { scans: [], truncated: false };
  const from = new Date(`${fromDay}T00:00:00+08:00`).toISOString();
  const to = new Date(`${toDay}T23:59:59.999+08:00`).toISOString();
  const scans: AnalyticsScan[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const { data, error } = await sb
      .from("scan_sessions")
      .select(
        "id, created_at, device_id, source, scan_detections(class_key, category_key, confidence, is_primary)",
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
  const sb = getSupabase();
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
  const sb = getSupabase();
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
  const sb = getSupabase();
  if (!sb) return { error: "Not available" };
  const { error } = await sb.from("devices").update(patch).eq("id", id);
  return error ? { error: error.message } : {};
}
