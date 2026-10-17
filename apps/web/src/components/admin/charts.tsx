// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// Dashboard charts (Phase 19), following the dataviz method: bins keep their fixed
// colours (validated; residual drawn in slate), legend + table view for identity,
// 2px surface gaps between stacked segments, recessive grid, text in ink tokens.
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BINS } from "@/lib/bins";
import { CATEGORIES, CHART_COLOR, type DailyRow } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/detector/types";

const SURFACE = "#ffffff";
const INK_3 = "#565d69";
const GRID = "#e4e7ec";
const SEQ = [
  "#f5f8fc",
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#184f95",
  "#0d366b",
];

const shortDay = (d: string) =>
  new Date(`${d}T12:00:00+08:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Legend">
      {CATEGORIES.map((c) => (
        <li key={c} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm"
            style={{ background: CHART_COLOR[c] }}
          />
          {BINS[c].name}
        </li>
      ))}
    </ul>
  );
}

function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: { color?: string; label: string; value: string }[];
}) {
  return (
    <div className="rounded-tile border border-line bg-white px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-semibold text-ink">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-ink-2">
          {r.color ? (
            <span aria-hidden className="size-2 rounded-sm" style={{ background: r.color }} />
          ) : null}
          <span className="flex-1">{r.label}</span>
          <span className="font-medium text-ink tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Detections per day, stacked by bin, with a table view toggle. */
export function DailyChart({ rows }: { rows: DailyRow[] }) {
  const [table, setTable] = useState(false);
  const empty = rows.every((r) => r.total === 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend />
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          className="min-h-9 text-xs font-medium text-brand-strong underline"
          aria-pressed={table}
        >
          {table ? "Show chart" : "Show as table"}
        </button>
      </div>
      {table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Detections per day by bin</caption>
            <thead className="sticky top-0 bg-white text-ink-3">
              <tr>
                <th className="py-1 pr-2 font-medium">Day</th>
                {CATEGORIES.map((c) => (
                  <th key={c} className="py-1 pr-2 text-right font-medium">
                    {BINS[c].shortName}
                  </th>
                ))}
                <th className="py-1 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.day} className="border-t border-line">
                  <td className="py-1 pr-2">{shortDay(r.day)}</td>
                  {CATEGORIES.map((c) => (
                    <td key={c} className="py-1 pr-2 text-right">
                      {r[c]}
                    </td>
                  ))}
                  <td className="py-1 text-right font-medium">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : empty ? (
        <p className="py-12 text-center text-sm text-ink-3">No scans in this period.</p>
      ) : (
        <div
          className="h-64"
          role="img"
          aria-label="Stacked bar chart of detections per day by bin. Use 'Show as table' for the values."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              barCategoryGap="20%"
            >
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="day"
                tickFormatter={shortDay}
                tick={{ fontSize: 11, fill: INK_3 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: INK_3 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(15,17,21,0.04)" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      title={shortDay(String(label))}
                      rows={[...CATEGORIES].reverse().map((c) => ({
                        color: CHART_COLOR[c],
                        label: BINS[c].name,
                        value: String((payload[0].payload as DailyRow)[c]),
                      }))}
                    />
                  ) : null
                }
              />
              {CATEGORIES.map((c, i) => (
                <Bar
                  key={c}
                  dataKey={c}
                  stackId="bins"
                  fill={CHART_COLOR[c]}
                  stroke={SURFACE}
                  strokeWidth={2}
                  radius={i === CATEGORIES.length - 1 ? [4, 4, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Single-series line (no second axis: two measures → two charts). */
export function TrendLine({
  data,
  dataKey,
  label,
  format,
  domain,
}: {
  data: { day: string; [k: string]: number | string | null }[];
  dataKey: string;
  label: string;
  format: (v: number) => string;
  domain?: [number, number];
}) {
  const hasData = data.some((d) => d[dataKey] !== null);
  if (!hasData)
    return <p className="py-10 text-center text-sm text-ink-3">No scans in this period.</p>;
  return (
    <div className="h-40" role="img" aria-label={`${label} per day`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tick={{ fontSize: 11, fill: INK_3 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={32}
          />
          <YAxis
            domain={domain ?? ["auto", "auto"]}
            tickFormatter={(v) => format(Number(v))}
            tick={{ fontSize: 11, fill: INK_3 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            content={({ active, payload, label: l }) =>
              active && payload?.length && payload[0].value !== null ? (
                <TooltipBox
                  title={shortDay(String(l))}
                  rows={[{ color: "#256abf", label, value: format(Number(payload[0].value)) }]}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#256abf"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars with value labels at the tip (HTML: fully accessible, no axis). */
export function HBarList({
  items,
}: {
  items: { key: string; label: string; value: number; display?: string; category: Category }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length)
    return <p className="py-6 text-center text-sm text-ink-3">No scans in this period.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm">
          <span className="truncate text-ink-2" title={i.label}>
            {i.label}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r"
              style={{
                width: `${Math.max(2, (i.value / max) * 85)}%`,
                background: CHART_COLOR[i.category],
              }}
              title={`${i.label}: ${i.display ?? i.value} (${BINS[i.category].name})`}
            />
            <span className="text-xs font-medium text-ink tabular-nums">
              {i.display ?? i.value}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Weekday × hour heatmap, sequential blue (light = few scans). */
export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(0, ...grid.flat());
  const step = (v: number) =>
    v === 0 || max === 0
      ? 0
      : 1 + Math.min(SEQ.length - 2, Math.floor((v / max) * (SEQ.length - 1)));
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[2px] text-[10px] text-ink-3">
        <caption className="sr-only">Scans by weekday and hour (Philippine time)</caption>
        <thead>
          <tr>
            <th />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} scope="col" className="w-5 font-normal">
                {h % 3 === 0 ? h : ""}
                <span className="sr-only">{h % 3 === 0 ? "" : `${h}:00`}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, d) => (
            <tr key={d}>
              <th scope="row" className="pr-1 text-right font-normal">
                {WEEKDAYS[d]}
              </th>
              {row.map((v, h) => (
                <td
                  key={h}
                  className={cn("h-5 w-5 rounded-[3px]")}
                  style={{ background: SEQ[step(v)] }}
                  title={`${WEEKDAYS[d]} ${h}:00–${h}:59 · ${v} scan${v === 1 ? "" : "s"}`}
                >
                  <span className="sr-only">{v}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-ink-3" aria-hidden>
        Fewer
        {SEQ.map((c) => (
          <span key={c} className="h-2.5 w-4 rounded-[2px]" style={{ background: c }} />
        ))}
        More
      </div>
    </div>
  );
}
