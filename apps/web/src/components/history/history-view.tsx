// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { ChevronDown, CloudUpload, History as HistoryIcon, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { BinTile, CategoryChip, Instruction } from "@/components/bins/bins";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, PageTitle, Skeleton } from "@/components/ui/primitives";
import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import { getItemLive, useContentSource } from "@/lib/content-store";
import { fetchHistory, type HistoryScan } from "@/lib/history";
import { useAuth } from "@/lib/supabase/auth";

function dayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

const timeOf = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function groupByDay(scans: HistoryScan[]) {
  const groups: { day: string; scans: HistoryScan[] }[] = [];
  for (const s of scans) {
    const day = dayLabel(new Date(s.createdAt));
    const last = groups.at(-1);
    if (last?.day === day) last.scans.push(s);
    else groups.push({ day, scans: [s] });
  }
  return groups;
}

function ScanRow({ scan }: { scan: HistoryScan }) {
  const [open, setOpen] = useState(false);
  const primary = scan.detections.find((d) => d.isPrimary) ?? scan.detections[0];
  if (!primary) return null;
  const item = getItemLive(primary.classKey);
  const extra = scan.detections.length - 1;
  const at = new Date(scan.createdAt);
  return (
    <li className="rounded-card bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <BinTile category={primary.category} size="sm" className="size-10 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">
            {item?.name ?? primary.classKey}
            {extra > 0 ? <span className="font-normal text-ink-3"> +{extra} more</span> : null}
          </span>
          <span className="block text-xs text-ink-3">
            {dayLabel(at) === "Today" ? "Today" : at.toLocaleDateString()} {timeOf(at)} ·{" "}
            {BINS[primary.category].binLabel}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <ul className="flex flex-col gap-3 border-t border-line px-3 pt-3 pb-4">
          {scan.detections.map((d) => {
            const c = getItemLive(d.classKey);
            return (
              <li key={d.classKey} className="flex gap-3">
                <BinTile category={d.category} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {c?.name ?? d.classKey}{" "}
                    <span className="text-xs font-normal text-ink-3">
                      {Math.round(d.confidence * 100)}% sure
                    </span>
                  </p>
                  <CategoryChip category={d.category} />
                  {c ? (
                    <Instruction
                      text={c.instruction}
                      category={d.category}
                      className="mt-1 text-sm text-ink-2"
                    />
                  ) : null}
                  <Link
                    href={`/guide/${d.category}#${d.classKey}`}
                    className="mt-1 inline-block text-xs font-medium text-brand-strong underline"
                  >
                    In the Bin Guide
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

export function HistoryView() {
  const auth = useAuth();
  useContentSource();
  const [scans, setScans] = useState<HistoryScan[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const userId = auth.user?.id ?? null;

  const load = useCallback(async (p: number) => {
    try {
      const res = await fetchHistory(p);
      setError(null);
      setScans((prev) => (p === 0 ? res.scans : [...prev, ...res.scans]));
      setMore(res.more);
      setPage(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // (Re)load the first page whenever the account changes (sign-in, sign-out).
  useEffect(() => {
    if (auth.loading) return;
    let cancelled = false;
    fetchHistory(0)
      .then((res) => {
        if (cancelled) return;
        setError(null);
        setScans(res.scans);
        setMore(res.more);
        setPage(0);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [auth.loading, userId]);

  const loadMore = useCallback(() => {
    setLoading(true);
    void load(page + 1);
  }, [load, page]);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) loadMore();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [more, loading, loadMore]);

  function retry() {
    setLoading(true);
    setError(null);
    void load(0);
  }

  const guest = !auth.user || auth.isAnonymous;

  return (
    <div className="flex flex-col gap-6 md:max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <PageTitle title="History" />
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-strong"
        >
          <UserRound aria-hidden className="size-4" />
          {guest ? "Account" : (auth.user?.email ?? "Account")}
        </Link>
      </div>

      {guest && scans.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-card bg-brand-tint p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CloudUpload aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-strong" />
            <div>
              <p className="font-semibold text-ink">Save your history</p>
              <p className="text-sm text-ink-2">
                Your scans are only on this device. Create an account to keep them and see them
                anywhere.
              </p>
            </div>
          </div>
          <ButtonLink href="/account" className="shrink-0">
            Save history
          </ButtonLink>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-card bg-card p-4 text-sm shadow-card">
          <p className="font-semibold text-ink">Couldn&apos;t load your history</p>
          <p className="mt-1 text-ink-3">{error}</p>
          <Button variant="outline" className="mt-3" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading && scans.length === 0 ? (
        <div className="flex flex-col gap-3" aria-busy>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : null}

      {!loading && !error && scans.length === 0 ? (
        <EmptyState icon={<HistoryIcon className="size-10" />} title="No scans yet">
          <p>Items you scan show up here.</p>
          <ButtonLink href="/scan" className="mt-4">
            Start scanning
          </ButtonLink>
        </EmptyState>
      ) : null}

      {groupByDay(scans).map((group) => (
        <section key={group.day} aria-label={group.day} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">{group.day}</h2>
          <ul className="flex flex-col gap-3">
            {group.scans.map((s) => (
              <ScanRow key={s.id} scan={s} />
            ))}
          </ul>
        </section>
      ))}

      {more ? (
        <div ref={sentinel} className="flex justify-center">
          <Button variant="outline" disabled={loading} onClick={loadMore}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
