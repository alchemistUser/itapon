// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Download, LockKeyhole, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { DevicesPanel } from "@/components/admin/devices-panel";
import { ReviewQueue } from "@/components/admin/review-queue";
import { DailyChart, Heatmap, HBarList, TrendLine } from "@/components/admin/charts";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, PageTitle, Skeleton } from "@/components/ui/primitives";
import {
  fetchDevices,
  fetchKioskUptime,
  fetchInstitutionFeedback,
  fetchInstitutionScans,
  useAdminContext,
  type AdminDevice,
  type KioskUptime,
} from "@/lib/admin";
import {
  applyFilters,
  byDevice,
  byModelVersion,
  latencyBySource,
  CATEGORIES,
  confidenceDaily,
  dailyByCategory,
  dayRange,
  filterFeedback,
  kpis,
  manilaDay,
  shareByCategory,
  toCSV,
  topItems,
  weekdayHourHeatmap,
  wrongRateByItem,
  type AnalyticsScan,
  type FeedbackRow,
} from "@/lib/analytics";
import { BINS } from "@/lib/bins";
import { getItemLive } from "@/lib/content-store";
import type { Category } from "@/lib/detector/types";

const RANGES = [7, 30, 90] as const;

function rangeDays(n: number) {
  const to = manilaDay(new Date());
  const from = manilaDay(new Date(Date.now() - (n - 1) * 86_400_000));
  return { from, to };
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
    </Card>
  );
}

function Panel({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}

const selectCls = "h-10 rounded-control border border-line bg-white px-3 text-sm text-ink";

export function AdminDashboard() {
  const admin = useAdminContext();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [deviceId, setDeviceId] = useState<string>("");
  const [category, setCategory] = useState<Category | "">("");
  const [scans, setScans] = useState<AnalyticsScan[]>([]);
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [uptime, setUptime] = useState<Record<string, KioskUptime>>({});
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // The clock is read in a timer, never during render (prerender would freeze it).
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setRange(rangeDays(days)));
    return () => clearTimeout(t);
  }, [days, reloadKey]);
  const from = range?.from ?? "";
  const to = range?.to ?? "";

  useEffect(() => {
    if (!admin.isAdmin || !range) return;
    let cancelled = false;
    Promise.all([
      fetchInstitutionScans(range.from, range.to),
      fetchDevices(),
      fetchInstitutionFeedback(range.from, range.to),
      fetchKioskUptime(range.from, range.to),
    ])
      .then(([res, devs, fb, up]) => {
        if (cancelled) return;
        setUptime(up);
        setScans(res.scans);
        setFeedback(fb);
        setTruncated(res.truncated);
        setDevices(devs);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [admin.isAdmin, range]);

  const filtered = useMemo(
    () => applyFilters(scans, { deviceId: deviceId || null, category: category || null }),
    [scans, deviceId, category],
  );
  const filteredFeedback = useMemo(
    () => filterFeedback(feedback, { deviceId: deviceId || null, category: category || null }),
    [feedback, deviceId, category],
  );
  const dayList = useMemo(() => (range ? dayRange(range.from, range.to) : []), [range]);
  const deviceLabel = (id: string | null) =>
    id ? (devices.find((d) => d.id === id)?.label ?? "Removed kiosk") : "Phones & web";

  if (admin.loading) return <Skeleton className="h-40" />;
  if (!admin.isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-card px-6 py-12 text-center shadow-card">
        <LockKeyhole aria-hidden className="size-8 text-ink-3" />
        <h1 className="text-lg font-semibold text-ink">Admins only</h1>
        <p className="max-w-sm text-sm text-ink-3">
          The dashboard shows waste data for an institution. Sign in with an admin account; an
          existing admin or the project team can grant access.
        </p>
        <ButtonLink href="/account">Go to Account</ButtonLink>
      </div>
    );
  }

  if (!range || (loading && !scans.length && !error)) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <PageTitle title="Dashboard" subtitle={`${admin.institution?.name} · loading…`} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const k = kpis(filtered);
  const share = shareByCategory(filtered);
  const top = topItems(filtered, 10);
  const conf = confidenceDaily(filtered, dayList);
  const wrong = wrongRateByItem(filteredFeedback);
  const wrongTotal = filteredFeedback.filter((f) => !f.isCorrect).length;
  const versions = byModelVersion(filtered, filteredFeedback);
  const speed = latencyBySource(filtered);
  const reload = () => {
    setLoading(true);
    setReloadKey((n) => n + 1);
  };

  function exportCsv() {
    const blob = new Blob([toCSV(filtered, deviceLabel)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `itapon-scans-${from}-to-${to}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle title="Dashboard" subtitle={`${admin.institution?.name} · Philippine time`} />
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
          <Download aria-hidden className="size-4" /> Export CSV
        </Button>
      </div>

      {/* filters: one row above the charts */}
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filters">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          Period
          <select
            className={selectCls}
            value={days}
            onChange={(e) => {
              setLoading(true);
              setDays(Number(e.target.value) as (typeof RANGES)[number]);
            }}
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>
                Last {r} days
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          Device
          <select
            className={selectCls}
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          >
            <option value="">All devices</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          Bin
          <select
            className={selectCls}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "")}
          >
            <option value="">All bins</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {BINS[c].name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLoading(true);
            setReloadKey((n) => n + 1);
          }}
        >
          <RefreshCw aria-hidden className="size-4" /> Refresh
        </Button>
        <span className="text-xs text-ink-3" aria-live="polite">
          {loading ? "Loading…" : `${from} to ${to}`}
          {truncated ? " · showing the first 20,000 scans" : ""}
        </span>
      </div>

      {error ? (
        <p role="alert" className="rounded-card bg-bin-red-tint p-4 text-sm text-ink">
          Couldn&apos;t load data: {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi
          label="Scans"
          value={k.scans.toLocaleString()}
          hint={`${k.detections.toLocaleString()} items`}
        />
        <Kpi label="Today" value={k.today.toLocaleString()} hint="scans" />
        <Kpi
          label="Active kiosks"
          value={`${k.activeDevices}/${devices.length}`}
          hint="in the last 24 h"
        />
        <Kpi
          label="Hazardous items"
          value={share.find((s) => s.category === "hazardous")!.count.toLocaleString()}
          hint="sent to the red bin or collection"
        />
        <Kpi
          label="Avg confidence"
          value={k.avgConfidence === null ? "–" : `${Math.round(k.avgConfidence * 100)}%`}
          hint="of the locked item"
        />
      </div>

      <Panel title="Items per day by bin">
        <DailyChart rows={dailyByCategory(filtered, dayList)} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Share by bin">
          <HBarList
            items={share.map((s) => ({
              key: s.category,
              label: BINS[s.category].name,
              value: s.count,
              display: `${s.pct}% · ${s.count}`,
              category: s.category,
            }))}
          />
        </Panel>
        <Panel title="Top items">
          <HBarList
            items={top.map((t) => ({
              key: t.classKey,
              label: getItemLive(t.classKey)?.name ?? t.classKey,
              value: t.count,
              category: t.category,
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel
          title="When people scan"
          aside={<span className="text-xs text-ink-3">for janitorial scheduling</span>}
        >
          <Heatmap grid={weekdayHourHeatmap(filtered)} />
        </Panel>
        <Panel title="By device">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-3">
              <tr>
                <th className="py-1 font-medium">Device</th>
                <th className="py-1 text-right font-medium">Scans</th>
                <th className="py-1 text-right font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {byDevice(filtered).map((d) => (
                <tr key={d.deviceId ?? "none"} className="border-t border-line">
                  <td className="py-1.5">{deviceLabel(d.deviceId)}</td>
                  <td className="py-1.5 text-right tabular-nums">{d.scans}</td>
                  <td className="py-1.5 text-right text-xs text-ink-3">
                    {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "–"}
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-ink-3">
                    No scans in this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel
        title="Model health"
        aside={<span className="text-xs text-ink-3">zero-shot model (D11)</span>}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium text-ink-2">
              Average confidence of locked items
            </p>
            <TrendLine
              data={conf}
              dataKey="avgConfidence"
              label="Average confidence"
              format={(v) => `${Math.round(v * 100)}%`}
              domain={[0, 1]}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-ink-2">Locked below the “confident” tier</p>
            <TrendLine
              data={conf}
              dataKey="lowRate"
              label="Low-confidence rate"
              format={(v) => `${Math.round(v)}%`}
              domain={[0, 100]}
            />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-ink-2">
              Marked wrong by users
              <span className="ml-2 text-xs font-normal text-ink-3">
                {filteredFeedback.length
                  ? `${wrongTotal} of ${filteredFeedback.length} answers (${Math.round(
                      (wrongTotal / filteredFeedback.length) * 100,
                    )}%)`
                  : "no answers yet"}
              </span>
            </p>
            <HBarList
              items={wrong.map((w) => ({
                key: w.classKey,
                label: getItemLive(w.classKey)?.name ?? w.classKey,
                value: w.pct,
                display: `${w.pct}% · ${w.wrong}/${w.answers}`,
                category: w.category,
              }))}
              empty="No items marked wrong."
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-ink-2">By model version</p>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink-3">
                <tr>
                  <th className="py-1 font-medium">Model</th>
                  <th className="py-1 text-right font-medium">Scans</th>
                  <th className="py-1 text-right font-medium">Avg conf.</th>
                  <th className="py-1 text-right font-medium">Wrong</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {versions.map((v) => (
                  <tr key={v.version} className="border-t border-line">
                    <td className="py-1.5 font-mono text-xs">{v.version}</td>
                    <td className="py-1.5 text-right">{v.scans}</td>
                    <td className="py-1.5 text-right">
                      {v.avgConfidence === null ? "–" : `${Math.round(v.avgConfidence * 100)}%`}
                    </td>
                    <td className="py-1.5 text-right">
                      {v.wrongPct === null ? "–" : `${v.wrongPct}% of ${v.answers}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-ink-2">
              Time to result on real devices
              <span className="ml-2 text-xs font-normal text-ink-3">
                from scan start to locked result, measured on the device
              </span>
            </p>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink-3">
                <tr>
                  <th className="py-1 font-medium">Device type</th>
                  <th className="py-1 font-medium">Engine</th>
                  <th className="py-1 text-right font-medium">Scans</th>
                  <th className="py-1 text-right font-medium">Median</th>
                  <th className="py-1 text-right font-medium">Slowest 10%</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {speed.map((r) => (
                  <tr key={`${r.source}-${r.backend}`} className="border-t border-line">
                    <td className="py-1.5 capitalize">{r.source}</td>
                    <td className="py-1.5 font-mono text-xs">{r.backend}</td>
                    <td className="py-1.5 text-right">{r.scans}</td>
                    <td className="py-1.5 text-right">{(r.p50 / 1000).toFixed(1)} s</td>
                    <td className="py-1.5 text-right">{(r.p90 / 1000).toFixed(1)} s</td>
                  </tr>
                ))}
                {!speed.length ? (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-ink-3">
                      No timed scans in this period.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <ReviewQueue rows={filteredFeedback} onChange={reload} />

      <DevicesPanel devices={devices} uptime={uptime} onChange={reload} />
    </div>
  );
}
