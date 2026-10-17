// SPDX-License-Identifier: AGPL-3.0-or-later
// Institution analytics (Phase 19). Pure aggregation over scans the admin can read (RLS),
// so it is easy to test and to explain in the manuscript. All day/hour buckets use
// Philippine time (Asia/Manila), matching the SQL RPCs from Phase 10.
import { CONFIDENT_THRESHOLD } from "@/lib/detector/models";
import type { Category } from "@/lib/detector/types";

export const TZ = "Asia/Manila";
export const CATEGORIES: Category[] = ["biodegradable", "recyclable", "residual", "hazardous"];

/** Chart colours per bin. Residual uses slate instead of near-black so it stays inside
 * the chart lightness band (validated with the dataviz palette checker). */
export const CHART_COLOR: Record<Category, string> = {
  biodegradable: "#2ea043",
  recyclable: "#0a84ff",
  residual: "#475569",
  hazardous: "#e5484d",
};

export interface AnalyticsDetection {
  classKey: string;
  category: Category;
  confidence: number;
  isPrimary: boolean;
}

export interface AnalyticsScan {
  id: string;
  createdAt: string; // ISO
  deviceId: string | null;
  source: string;
  detections: AnalyticsDetection[];
}

export interface Filters {
  deviceId?: string | null; // null/undefined = all
  category?: Category | null;
}

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  hourCycle: "h23",
  weekday: "short",
});
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "2026-10-17" in Manila time. */
export const manilaDay = (iso: string | Date) => dayFmt.format(new Date(iso));

function manilaHourWeekday(iso: string): { hour: number; weekday: number } {
  const parts = partsFmt.formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const wd = WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")?.value ?? "Mon");
  return { hour, weekday: Math.max(0, wd) };
}

/** Device filter keeps whole scans; category filter keeps only matching detections. */
export function applyFilters(scans: AnalyticsScan[], f: Filters): AnalyticsScan[] {
  return scans
    .filter((s) => !f.deviceId || s.deviceId === f.deviceId)
    .map((s) =>
      f.category ? { ...s, detections: s.detections.filter((d) => d.category === f.category) } : s,
    )
    .filter((s) => s.detections.length > 0);
}

/** Every day from..to inclusive (Manila dates), so empty days show as zero. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00+08:00`);
  const end = new Date(`${to}T12:00:00+08:00`);
  while (d <= end) {
    out.push(manilaDay(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export type DailyRow = { day: string; total: number } & Record<Category, number>;

/** Detections per day, stacked by bin. */
export function dailyByCategory(scans: AnalyticsScan[], days: string[]): DailyRow[] {
  const rows = new Map<string, DailyRow>(
    days.map((day) => [
      day,
      { day, total: 0, biodegradable: 0, recyclable: 0, residual: 0, hazardous: 0 },
    ]),
  );
  for (const s of scans) {
    const row = rows.get(manilaDay(s.createdAt));
    if (!row) continue;
    for (const d of s.detections) {
      row[d.category] += 1;
      row.total += 1;
    }
  }
  return [...rows.values()];
}

export function shareByCategory(
  scans: AnalyticsScan[],
): { category: Category; count: number; pct: number }[] {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  let total = 0;
  for (const s of scans)
    for (const d of s.detections) {
      counts[d.category] += 1;
      total += 1;
    }
  return CATEGORIES.map((category) => ({
    category,
    count: counts[category],
    pct: total ? Math.round((counts[category] / total) * 1000) / 10 : 0,
  }));
}

export function topItems(scans: AnalyticsScan[], n = 10) {
  const m = new Map<string, { classKey: string; category: Category; count: number }>();
  for (const s of scans)
    for (const d of s.detections) {
      const e = m.get(d.classKey) ?? { classKey: d.classKey, category: d.category, count: 0 };
      e.count += 1;
      m.set(d.classKey, e);
    }
  return [...m.values()]
    .sort((a, b) => b.count - a.count || a.classKey.localeCompare(b.classKey))
    .slice(0, n);
}

/** 7 × 24 grid of scan counts (rows Mon..Sun, columns 0..23 h), Manila time. */
export function weekdayHourHeatmap(scans: AnalyticsScan[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const s of scans) {
    const { hour, weekday } = manilaHourWeekday(s.createdAt);
    grid[weekday][hour] += 1;
  }
  return grid;
}

export interface DeviceStat {
  deviceId: string | null;
  scans: number;
  lastSeen: string | null;
}

export function byDevice(scans: AnalyticsScan[]): DeviceStat[] {
  const m = new Map<string | null, DeviceStat>();
  for (const s of scans) {
    const e = m.get(s.deviceId) ?? { deviceId: s.deviceId, scans: 0, lastSeen: null };
    e.scans += 1;
    if (!e.lastSeen || s.createdAt > e.lastSeen) e.lastSeen = s.createdAt;
    m.set(s.deviceId, e);
  }
  return [...m.values()].sort((a, b) => b.scans - a.scans);
}

/** Model health per day: average confidence of the locked item and the share of scans
 * that locked below the "confident" tier (a proxy for how often users see "possibly"). */
export function confidenceDaily(scans: AnalyticsScan[], days: string[]) {
  const acc = new Map(days.map((d) => [d, { sum: 0, n: 0, low: 0 }]));
  for (const s of scans) {
    const p = s.detections.find((d) => d.isPrimary) ?? s.detections[0];
    const a = acc.get(manilaDay(s.createdAt));
    if (!p || !a) continue;
    a.sum += p.confidence;
    a.n += 1;
    if (p.confidence < CONFIDENT_THRESHOLD) a.low += 1;
  }
  return days.map((day) => {
    const a = acc.get(day)!;
    return {
      day,
      scans: a.n,
      avgConfidence: a.n ? Math.round((a.sum / a.n) * 1000) / 1000 : null,
      lowRate: a.n ? Math.round((a.low / a.n) * 1000) / 10 : null,
    };
  });
}

export function kpis(scans: AnalyticsScan[], now = new Date()) {
  const today = manilaDay(now);
  const dayAgo = now.getTime() - 24 * 3600 * 1000;
  const detections = scans.reduce((n, s) => n + s.detections.length, 0);
  const primaries = scans
    .map((s) => s.detections.find((d) => d.isPrimary) ?? s.detections[0])
    .filter(Boolean);
  return {
    scans: scans.length,
    detections,
    today: scans.filter((s) => manilaDay(s.createdAt) === today).length,
    activeDevices: new Set(
      scans
        .filter((s) => s.deviceId && new Date(s.createdAt).getTime() >= dayAgo)
        .map((s) => s.deviceId),
    ).size,
    avgConfidence: primaries.length
      ? Math.round((primaries.reduce((a, d) => a + d!.confidence, 0) / primaries.length) * 100) /
        100
      : null,
  };
}

const csvCell = (v: string | number | boolean | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per detection, Manila local time, for institutional reports. */
export function toCSV(scans: AnalyticsScan[], deviceLabel: (id: string | null) => string): string {
  const head = [
    "scan_id",
    "date_manila",
    "time_manila",
    "device",
    "source",
    "item",
    "bin",
    "confidence",
    "primary",
  ];
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const lines = [head.join(",")];
  for (const s of scans)
    for (const d of s.detections) {
      lines.push(
        [
          s.id,
          manilaDay(s.createdAt),
          time.format(new Date(s.createdAt)),
          deviceLabel(s.deviceId),
          s.source,
          d.classKey,
          d.category,
          d.confidence,
          d.isPrimary,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  return lines.join("\n") + "\n";
}
