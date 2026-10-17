// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import {
  applyFilters,
  byDevice,
  confidenceDaily,
  dailyByCategory,
  dayRange,
  kpis,
  manilaDay,
  shareByCategory,
  toCSV,
  topItems,
  weekdayHourHeatmap,
  type AnalyticsScan,
} from "./analytics";

const scan = (
  id: string,
  createdAt: string,
  deviceId: string | null,
  dets: [string, AnalyticsScan["detections"][number]["category"], number][],
): AnalyticsScan => ({
  id,
  createdAt,
  deviceId,
  source: deviceId ? "kiosk" : "mobile",
  detections: dets.map(([classKey, category, confidence], i) => ({
    classKey,
    category,
    confidence,
    isPrimary: i === 0,
  })),
});

// 2026-10-16T16:30Z = Oct 17 00:30 in Manila (UTC+8): must count as Oct 17, a Saturday.
const scans = [
  scan("a", "2026-10-16T16:30:00Z", "k1", [
    ["paper_bag", "recyclable", 0.6],
    ["battery", "hazardous", 0.4],
  ]),
  scan("b", "2026-10-17T03:00:00Z", "k1", [["banana_peel", "biodegradable", 0.3]]),
  scan("c", "2026-10-15T04:00:00Z", null, [["paper_bag", "recyclable", 0.5]]),
];

describe("analytics", () => {
  it("buckets by Manila day, not UTC", () => {
    expect(manilaDay("2026-10-16T16:30:00Z")).toBe("2026-10-17");
    expect(dayRange("2026-10-15", "2026-10-17")).toEqual([
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
    ]);
  });

  it("stacks detections per day by bin, with empty days as zero", () => {
    const rows = dailyByCategory(scans, dayRange("2026-10-15", "2026-10-17"));
    expect(rows.map((r) => [r.day, r.total])).toEqual([
      ["2026-10-15", 1],
      ["2026-10-16", 0],
      ["2026-10-17", 3],
    ]);
    expect(rows[2]).toMatchObject({ recyclable: 1, hazardous: 1, biodegradable: 1, residual: 0 });
  });

  it("filters by device (whole scans) and by bin (detections)", () => {
    expect(applyFilters(scans, { deviceId: "k1" }).map((s) => s.id)).toEqual(["a", "b"]);
    const haz = applyFilters(scans, { category: "hazardous" });
    expect(haz.map((s) => s.id)).toEqual(["a"]);
    expect(haz[0].detections).toHaveLength(1);
  });

  it("computes bin shares, top items, device stats and the heatmap", () => {
    expect(shareByCategory(scans).find((x) => x.category === "recyclable")).toEqual({
      category: "recyclable",
      count: 2,
      pct: 50,
    });
    expect(topItems(scans, 2)).toEqual([
      { classKey: "paper_bag", category: "recyclable", count: 2 },
      { classKey: "banana_peel", category: "biodegradable", count: 1 },
    ]);
    expect(byDevice(scans)[0]).toEqual({
      deviceId: "k1",
      scans: 2,
      lastSeen: "2026-10-17T03:00:00Z",
    });
    const grid = weekdayHourHeatmap(scans);
    expect(grid[5][0]).toBe(1); // Saturday 00:xx Manila
    expect(grid[5][11]).toBe(1); // Saturday 11:00 Manila
  });

  it("tracks model confidence and the low-confidence rate per day", () => {
    const [, , oct17] = confidenceDaily(scans, dayRange("2026-10-15", "2026-10-17"));
    expect(oct17).toEqual({ day: "2026-10-17", scans: 2, avgConfidence: 0.45, lowRate: 50 });
  });

  it("summarises KPIs", () => {
    expect(kpis(scans, new Date("2026-10-17T05:00:00Z"))).toEqual({
      scans: 3,
      detections: 4,
      today: 2,
      activeDevices: 1,
      avgConfidence: 0.47,
    });
  });

  it("exports one CSV row per detection with Manila time", () => {
    const csv = toCSV(scans.slice(0, 1), (id) =>
      id === "k1" ? "Canteen, ground floor" : "Phones",
    );
    expect(csv.split("\n")[1]).toBe(
      'a,2026-10-17,00:30,"Canteen, ground floor",kiosk,paper_bag,recyclable,0.6,true',
    );
  });
});
