// SPDX-License-Identifier: AGPL-3.0-or-later
// Admin data for v2 (ROADMAP-v2 Phase 34): points statistics, the "not found" search
// backlog, knowledge tests, and the institution's own library notes and drop-off points.
// Everything runs in the browser under RLS / admin-only functions.
"use client";

import { friendlyError } from "@/lib/accounts";
import { getSupabase } from "@/lib/supabase/client";

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error("Not available right now.");
  return sb;
}

export interface PointsStats {
  byMission: { code: string; awards: number; points: number }[];
  daily: { day: string; players: number }[];
  players: number;
  points: number;
  previousPlayers: number;
  returningPlayers: number;
  reversals: number;
}

export async function fetchPointsStats(from: string, to: string): Promise<PointsStats> {
  const sb = await client();
  const { data, error } = await sb.rpc("admin_points_stats", { p_from: from, p_to: to });
  if (error) throw new Error(friendlyError(error));
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    byMission: (d.by_mission as PointsStats["byMission"]) ?? [],
    daily: (d.daily as PointsStats["daily"]) ?? [],
    players: Number(d.players ?? 0),
    points: Number(d.points ?? 0),
    previousPlayers: Number(d.previous_players ?? 0),
    returningPlayers: Number(d.returning_players ?? 0),
    reversals: Number(d.reversals ?? 0),
  };
}

/** Share of last period's players who played again this period (pure; tested). */
export function returnRate(s: Pick<PointsStats, "previousPlayers" | "returningPlayers">) {
  return s.previousPlayers ? s.returningPlayers / s.previousPlayers : null;
}

export async function fetchSearchMisses(
  from: string,
  to: string,
): Promise<{ query: string; searches: number; lastSeen: string }[]> {
  const sb = await client();
  const { data, error } = await sb.rpc("admin_search_misses", { p_from: from, p_to: to });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).map((r) => ({
    query: r.query,
    searches: Number(r.searches),
    lastSeen: r.last_seen,
  }));
}

export interface KnowledgeRow {
  code: string;
  form: "pre" | "post";
  score: number;
  total: number;
  createdAt: string;
}

export async function fetchKnowledgeTests(): Promise<KnowledgeRow[]> {
  const sb = await client();
  const { data, error } = await sb
    .from("knowledge_tests")
    .select("participant_code, form, score, total, created_at")
    .order("participant_code");
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).map((r) => ({
    code: r.participant_code,
    form: r.form as KnowledgeRow["form"],
    score: r.score,
    total: r.total,
    createdAt: r.created_at,
  }));
}

/** Pre/post summary over participants who did both (pure; tested). */
export function knowledgeSummary(rows: KnowledgeRow[]) {
  const by = new Map<string, { pre?: number; post?: number }>();
  for (const r of rows) by.set(r.code, { ...by.get(r.code), [r.form]: r.score });
  const paired = [...by.values()].filter(
    (v): v is { pre: number; post: number } => v.pre !== undefined && v.post !== undefined,
  );
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    pre: rows.filter((r) => r.form === "pre").length,
    post: rows.filter((r) => r.form === "post").length,
    paired: paired.length,
    meanPre: mean(paired.map((p) => p.pre)),
    meanPost: mean(paired.map((p) => p.post)),
    meanGain: mean(paired.map((p) => p.post - p.pre)),
  };
}

/** knowledge.csv for scripts/pilot_report.py (pure; tested). */
export function knowledgeCsv(rows: KnowledgeRow[]): string {
  return (
    [
      "participant_id,form,score,total",
      ...rows.map((r) => `${r.code},${r.form},${r.score},${r.total}`),
    ].join("\n") + "\n"
  );
}

// ---------------------------------------------------------------- campus notes & drop-offs

export interface CampusNote {
  id: string;
  itemSlug: string | null;
  materialCode: string | null;
  noteEn: string;
  noteFil: string | null;
  status: "draft" | "published";
}

export interface CampusDropoff {
  id: string;
  name: string;
  destination: string;
  address: string | null;
  mapUrl: string | null;
  hours: string | null;
  notes: string | null;
  status: "draft" | "published";
}

export async function fetchCampusContent(institutionId: string) {
  const sb = await client();
  const [notes, points] = await Promise.all([
    sb
      .from("library_local_rules")
      .select("id, item_slug, material_code, note_en, note_fil, status")
      .eq("institution_id", institutionId)
      .order("created_at"),
    sb
      .from("library_dropoff_points")
      .select("id, name, destination_code, address, map_url, hours, notes, status")
      .eq("institution_id", institutionId)
      .order("name"),
  ]);
  if (notes.error) throw new Error(friendlyError(notes.error));
  if (points.error) throw new Error(friendlyError(points.error));
  return {
    notes: (notes.data ?? []).map((n): CampusNote => ({
      id: n.id,
      itemSlug: n.item_slug,
      materialCode: n.material_code,
      noteEn: n.note_en,
      noteFil: n.note_fil,
      status: n.status as CampusNote["status"],
    })),
    dropoffs: (points.data ?? []).map((d): CampusDropoff => ({
      id: d.id,
      name: d.name,
      destination: d.destination_code,
      address: d.address,
      mapUrl: d.map_url,
      hours: d.hours,
      notes: d.notes,
      status: d.status as CampusDropoff["status"],
    })),
  };
}

export async function saveCampusNote(
  institutionId: string,
  note: Omit<CampusNote, "id"> & { id?: string },
): Promise<void> {
  const sb = await client();
  const row = {
    institution_id: institutionId,
    item_slug: note.itemSlug,
    material_code: note.materialCode,
    note_en: note.noteEn.trim(),
    note_fil: note.noteFil?.trim() || null,
    status: note.status,
  };
  const { error } = note.id
    ? await sb.from("library_local_rules").update(row).eq("id", note.id)
    : await sb.from("library_local_rules").insert(row);
  if (error) throw new Error(friendlyError(error));
}

export async function saveCampusDropoff(
  institutionId: string,
  d: Omit<CampusDropoff, "id"> & { id?: string },
): Promise<void> {
  const sb = await client();
  const row = {
    institution_id: institutionId,
    name: d.name.trim(),
    destination_code: d.destination,
    address: d.address?.trim() || null,
    map_url: d.mapUrl?.trim() || null,
    hours: d.hours?.trim() || null,
    notes: d.notes?.trim() || null,
    status: d.status,
  };
  const { error } = d.id
    ? await sb.from("library_dropoff_points").update(row).eq("id", d.id)
    : await sb.from("library_dropoff_points").insert(row);
  if (error) throw new Error(friendlyError(error));
}

export async function deleteCampusRow(
  table: "library_local_rules" | "library_dropoff_points",
  id: string,
): Promise<void> {
  const sb = await client();
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) throw new Error(friendlyError(error));
}
