// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import {
  applyFilters,
  byModelVersion,
  latencyBySource,
  filterFeedback,
  wrongRateByItem,
  type FeedbackRow,
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

const fb = (
  id: string,
  predicted: string,
  isCorrect: boolean,
  extra: Partial<FeedbackRow> = {},
): FeedbackRow => ({
  id,
  createdAt: "2026-10-10T02:00:00Z",
  deviceId: null,
  predictedClassKey: predicted,
  predictedCategory: predicted === "battery" ? "hazardous" : "recyclable",
  isCorrect,
  correctedClassKey: null,
  modelVersion: "itapon-world-v0.1",
  imagePath: null,
  reviewStatus: "pending",
  reviewedClassKey: null,
  ...extra,
});

describe("feedback", () => {
  const rows = [
    fb("1", "plastic_bottle", false),
    fb("2", "plastic_bottle", true),
    fb("3", "battery", false, { deviceId: "k1" }),
    fb("4", "tin_can", true),
  ];

  it("ranks items by wrong rate and skips items never marked wrong", () => {
    expect(wrongRateByItem(rows)).toEqual([
      { classKey: "battery", category: "hazardous", answers: 1, wrong: 1, pct: 100 },
      { classKey: "plastic_bottle", category: "recyclable", answers: 2, wrong: 1, pct: 50 },
    ]);
  });

  it("filters feedback by device and predicted bin", () => {
    expect(filterFeedback(rows, { deviceId: "k1" }).map((r) => r.id)).toEqual(["3"]);
    expect(filterFeedback(rows, { category: "hazardous" }).map((r) => r.id)).toEqual(["3"]);
  });

  it("compares model versions in the field", () => {
    const v = (s: AnalyticsScan, modelVersion: string) => ({ ...s, modelVersion });
    const scans = [
      v(scan("a", "2026-10-10T02:00:00Z", null, [["tin_can", "recyclable", 0.6]]), "v0.1"),
      v(scan("b", "2026-10-10T03:00:00Z", null, [["tin_can", "recyclable", 0.8]]), "v0.2"),
      v(scan("c", "2026-10-10T04:00:00Z", null, [["tin_can", "recyclable", 0.4]]), "v0.2"),
    ];
    const res = byModelVersion(scans, [
      fb("x", "tin_can", false, { modelVersion: "v0.2" }),
      fb("y", "tin_can", true, { modelVersion: "v0.2" }),
    ]);
    expect(res.map((r) => r.version)).toEqual(["v0.2", "v0.1"]);
    expect(res[0]).toMatchObject({ scans: 2, answers: 2, wrongPct: 50 });
    expect(res[0].avgConfidence).toBeCloseTo(0.6);
    expect(res[1]).toMatchObject({ scans: 1, answers: 0, wrongPct: null });
  });
});

describe("real-device speed", () => {
  it("groups time-to-result by device type and backend", () => {
    const mk = (id: string, source: string, latencyMs: number | null, backend = "wasm") => ({
      ...scan(id, "2026-10-10T02:00:00Z", null, [["tin_can", "recyclable", 0.6]]),
      source,
      latencyMs,
      backend,
    });
    const rows = latencyBySource([
      mk("1", "mobile", 900),
      mk("2", "mobile", 1100),
      mk("3", "mobile", 3000),
      mk("4", "kiosk", 500),
      mk("5", "mobile", null),
    ]);
    expect(rows[0]).toEqual({ source: "mobile", backend: "wasm", scans: 3, p50: 1100, p90: 3000 });
    expect(rows[1]).toMatchObject({ source: "kiosk", scans: 1, p50: 500 });
  });
});
