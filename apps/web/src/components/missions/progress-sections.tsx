// SPDX-License-Identifier: AGPL-3.0-or-later
// Level, streak, badges and the institution leaderboard (ROADMAP-v2 Phase 33).
"use client";

import { Award, Flame, Lock, Medal } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/account/avatar";
import { Card, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import {
  fetchBadges,
  fetchLeaderboard,
  fetchProgress,
  levelInfo,
  type Badge,
  type BoardRow,
} from "@/lib/progress";

export function LevelCard({ version, fil }: { version: number; fil: boolean }) {
  const [p, setP] = useState<{ total: number; streak: number } | null>(null);
  useEffect(() => {
    let live = true;
    fetchProgress()
      .then((r) => live && setP(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [version]);
  if (!p) return <Skeleton className="h-28" />;
  const lv = levelInfo(p.total);
  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xl font-bold text-brand-strong">
        {lv.level}
      </div>
      <div className="min-w-40 flex-1">
        <p className="text-xs font-medium text-ink-3">{fil ? "Antas" : "Level"}</p>
        <p className="text-lg font-bold text-ink">{lv.name}</p>
        <div
          role="progressbar"
          aria-label="Progress to the next level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={lv.pct}
          className="mt-1 h-2 overflow-hidden rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${lv.pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink-3">
          {lv.next ? `${lv.next - p.total} points to level ${lv.level + 1}` : "Top level reached"}
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-tile bg-surface px-3 py-2">
        <Flame aria-hidden className={cn("size-6", p.streak ? "text-[#c77c0a]" : "text-ink-4")} />
        <div>
          <p className="text-xl leading-none font-bold text-ink tabular-nums">{p.streak}</p>
          <p className="text-xs text-ink-3">day streak</p>
        </div>
      </div>
    </Card>
  );
}

export function BadgesCard({
  version,
  fil,
  onFresh,
}: {
  version: number;
  fil: boolean;
  onFresh: (titles: string[]) => void;
}) {
  const [badges, setBadges] = useState<Badge[] | null>(null);
  useEffect(() => {
    let live = true;
    fetchBadges()
      .then(({ badges: all, fresh }) => {
        if (!live) return;
        setBadges(all);
        if (fresh.length) onFresh(all.filter((b) => fresh.includes(b.code)).map((b) => b.titleEn));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [version, onFresh]);

  const earned = badges?.filter((b) => b.earnedAt).length ?? 0;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <Award aria-hidden className="size-5 text-brand-strong" /> Badges
        {badges ? (
          <span className="text-sm font-normal text-ink-3">
            {earned} of {badges.length}
          </span>
        ) : null}
      </h2>
      {badges ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {badges.map((b) => (
            <li
              key={b.code}
              className={cn(
                "flex items-start gap-2 rounded-tile p-2.5",
                b.earnedAt ? "bg-brand-tint" : "bg-surface",
              )}
            >
              {b.earnedAt ? (
                <Medal aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-strong" />
              ) : (
                <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-4" />
              )}
              <span>
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    b.earnedAt ? "text-ink" : "text-ink-3",
                  )}
                >
                  {fil ? b.titleFil : b.titleEn}
                  <span className="sr-only">{b.earnedAt ? " (earned)" : " (not yet)"}</span>
                </span>
                <span className="block text-xs text-ink-3">{fil ? b.howFil : b.howEn}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Skeleton className="h-32" />
      )}
    </Card>
  );
}

export function LeaderboardList({
  rows,
  compact = false,
}: {
  rows: BoardRow[];
  compact?: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {rows.map((r) => (
        <li
          key={`${r.rank}-${r.handle}`}
          className={cn(
            "flex items-center gap-3 border-b border-line py-2 last:border-0",
            r.isMe && "rounded-tile bg-brand-tint px-2",
          )}
        >
          <span className="w-6 text-right text-sm font-bold text-ink-3 tabular-nums">{r.rank}</span>
          <Avatar value={r.avatar} className={compact ? "size-8" : "size-9"} />
          <span className="flex-1 font-medium text-ink">
            @{r.handle}
            {r.isMe ? <span className="ml-1 text-xs text-ink-3">(you)</span> : null}
          </span>
          <span className="font-semibold text-ink tabular-nums">{r.points}</span>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardCard({ version }: { version: number }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  useEffect(() => {
    let live = true;
    fetchLeaderboard(period)
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [period, version]);

  const me = rows?.find((r) => r.isMe);
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Leaderboard</h2>
        <div role="group" aria-label="Period" className="flex gap-1 text-xs">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                "min-h-8 rounded-full px-3 font-semibold",
                period === p ? "bg-brand-tint text-brand-strong" : "text-ink-3 hover:text-ink",
              )}
            >
              This {p}
            </button>
          ))}
        </div>
      </div>
      {rows === null ? (
        <Skeleton className="h-24" />
      ) : rows.length ? (
        <LeaderboardList rows={rows} />
      ) : (
        <p className="text-sm text-ink-3">
          No one on your school or office board yet this {period}.
        </p>
      )}
      {rows && !me ? (
        <p className="text-xs text-ink-3">
          To appear: join your school or office, add a handle and turn on your public profile on{" "}
          <Link href="/account" className="underline">
            Account
          </Link>{" "}
          (18 and over, accounts older than 3 days).
        </p>
      ) : null}
    </Card>
  );
}
