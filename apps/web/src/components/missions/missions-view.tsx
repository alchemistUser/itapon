// SPDX-License-Identifier: AGPL-3.0-or-later
// Missions and points (ROADMAP-v2 Phase 32, D26). Everything is decided by the server; this
// screen shows today's and this week's missions, the quizzes and the points history.
"use client";

import { Check, CircleHelp, Flame, Gift, Lock, Trophy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BinTile } from "@/components/bins/bins";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, PageTitle, Skeleton } from "@/components/ui/primitives";
import { BIN_ORDER, BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/detector/types";
import { groupsOf, itemPath } from "@/lib/library/core";
import { useLibraryIndex } from "@/lib/library/client";
import {
  answerQuiz,
  claimable,
  claimMission,
  fetchDailyQuiz,
  fetchGroupQuiz,
  fetchMissions,
  fetchPointHistory,
  fetchPoints,
  MISSION_LINKS,
  quizScore,
  type Mission,
  type PointEvent,
  type QuizQuestion,
} from "@/lib/points";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/supabase/auth";
import { ensureUserId, getSupabase, supabaseConfigured } from "@/lib/supabase/client";

function MissionCard({
  m,
  guest,
  fil,
  onClaim,
}: {
  m: Mission;
  guest: boolean;
  fil: boolean;
  onClaim: (m: Mission) => void;
}) {
  const pct = Math.round((Math.min(m.progress, m.target) / m.target) * 100);
  const link = MISSION_LINKS[m.code];
  return (
    <li className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-ink" lang={fil ? "fil" : undefined}>
          {fil ? m.titleFil : m.titleEn}
        </p>
        <span className="shrink-0 rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
          +{m.points}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${m.titleEn} progress`}
        aria-valuemin={0}
        aria-valuemax={m.target}
        aria-valuenow={Math.min(m.progress, m.target)}
        className="h-2 overflow-hidden rounded-full bg-line"
      >
        <div
          className={cn("h-full rounded-full", m.claimed ? "bg-bin-green" : "bg-brand")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-ink-3 tabular-nums">
          {Math.min(m.progress, m.target)} / {m.target}
        </span>
        {m.claimed ? (
          <span className="inline-flex items-center gap-1 font-semibold text-[#1a7f37]">
            <Check aria-hidden className="size-4" /> Claimed
          </span>
        ) : m.blocked ? (
          <span className="text-xs text-[#c4282d]">Paused today: too many scans too fast</span>
        ) : claimable(m, guest) ? (
          <Button onClick={() => onClaim(m)}>
            <Gift aria-hidden className="size-4" /> Claim +{m.points}
          </Button>
        ) : m.progress >= m.target && guest ? (
          <Link href="/account" className="text-sm font-semibold text-brand-strong underline">
            Create an account to claim
          </Link>
        ) : link ? (
          <Link href={link.href} className="text-sm font-semibold text-brand-strong underline">
            {link.label}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function BinChoices({
  q,
  onAnswer,
  busy,
}: {
  q: QuizQuestion;
  onAnswer: (bin: Category) => void;
  busy: boolean;
}) {
  if (q.myAnswer) {
    const right = q.rightBin ? BINS[q.rightBin] : null;
    return (
      <p
        role="status"
        className={cn(
          "rounded-tile p-3 text-sm",
          q.correct ? "bg-bin-green-tint text-ink" : "bg-bin-red-tint text-ink",
        )}
      >
        {q.correct ? "Correct! " : "Not quite. "}
        {right ? (
          <>
            It goes in the <span className={cn("font-semibold", right.text)}>{right.binLabel}</span>
            .{" "}
          </>
        ) : null}
        <Link href={itemPath(q.slug)} className="font-semibold text-brand-strong underline">
          Why?
        </Link>
      </p>
    );
  }
  return (
    <div role="group" aria-label="Choose a bin" className="grid grid-cols-2 gap-2">
      {BIN_ORDER.map((b) => (
        <button
          key={b}
          type="button"
          disabled={busy}
          onClick={() => onAnswer(b)}
          className="flex min-h-12 items-center gap-2 rounded-tile border border-line bg-white p-2 text-left text-sm font-medium text-ink hover:bg-surface disabled:opacity-60"
        >
          <BinTile category={b} size="sm" />
          {BINS[b].binLabel}
        </button>
      ))}
    </div>
  );
}

function GroupQuiz({ fil, onDone }: { fil: boolean; onDone: () => void }) {
  const index = useLibraryIndex();
  const groups = useMemo(() => (index ? groupsOf(index.materials) : []), [index]);
  const [group, setGroup] = useState("");
  const [qs, setQs] = useState<QuizQuestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(g: string) {
    setGroup(g);
    setQs(null);
    setError(null);
    if (!g) return;
    try {
      setQs(await fetchGroupQuiz(g));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function answer(q: QuizQuestion, bin: Category) {
    setBusy(true);
    const r = await answerQuiz(q, bin);
    setBusy(false);
    if (r.error) return setError(r.error);
    const next = (qs ?? []).map((x) =>
      x.slug === q.slug
        ? { ...x, myAnswer: bin, correct: !!r.correct, rightBin: r.rightBin ?? null }
        : x,
    );
    setQs(next);
    if (quizScore(next).done) onDone();
  }

  const score = qs ? quizScore(qs) : null;
  return (
    <Card id="group-quiz" className="flex scroll-mt-24 flex-col gap-3 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <CircleHelp aria-hidden className="size-5 text-brand-strong" /> Material quiz
      </h2>
      <p className="text-sm text-ink-3">
        5 questions about one material. Get 4 right to pass. One try per question each week.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-ink">Material</span>
        <select
          value={group}
          onChange={(e) => void start(e.target.value)}
          className="h-11 rounded-control border border-line bg-white px-3"
        >
          <option value="">Choose a material…</option>
          {groups.map((g) => (
            <option key={g.code} value={g.code}>
              {fil ? g.name_fil : g.name_en}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-[#c4282d]">
          {error}
        </p>
      ) : null}
      {qs ? (
        <ol className="flex flex-col gap-4">
          {qs.map((q, i) => (
            <li key={q.slug} className="flex flex-col gap-2">
              <p className="text-sm font-medium text-ink">
                {i + 1}. Which bin does <strong>{fil ? q.nameFil : q.nameEn}</strong> go in?
              </p>
              <BinChoices q={q} busy={busy} onAnswer={(b) => void answer(q, b)} />
            </li>
          ))}
        </ol>
      ) : null}
      {score?.done ? (
        <p role="status" className="text-sm font-semibold text-ink">
          {score.right} of 5 right. {score.passed ? "Passed!" : "Try another material."}
        </p>
      ) : null}
    </Card>
  );
}

export function MissionsView() {
  const auth = useAuth();
  const fil = usePrefs().language === "fil";
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [points, setPoints] = useState<{ total: number; today: number; week: number } | null>(null);
  const [history, setHistory] = useState<PointEvent[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [noSession, setNoSession] = useState(false);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const guest = auth.isAnonymous;

  useEffect(() => {
    if (!supabaseConfigured) return;
    let live = true;
    void (async () => {
      // Missions need a user. Visitors who haven't scanned yet start one with a button, so
      // opening this page never creates a guest account by itself.
      const sb = await getSupabase();
      if (!sb || !(await sb.auth.getSession()).data.session) {
        if (live) setNoSession(true);
        return;
      }
      if (live) setNoSession(false);
      try {
        const [m, p, h, q] = await Promise.all([
          fetchMissions(),
          fetchPoints(),
          fetchPointHistory(),
          fetchDailyQuiz(),
        ]);
        if (!live) return;
        setMissions(m);
        setPoints(p);
        setHistory(h);
        setQuiz(q);
        setError(null);
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    })();
    return () => {
      live = false;
    };
  }, [version]);

  async function claim(m: Mission) {
    const r = await claimMission(m.code);
    setNote(r.error ?? `+${r.points} points for “${m.titleEn}”!`);
    reload();
  }

  async function answerDaily(bin: Category) {
    if (!quiz) return;
    setBusy(true);
    const r = await answerQuiz(quiz, bin);
    setBusy(false);
    if (r.error) return setNote(r.error);
    setQuiz({ ...quiz, myAnswer: bin, correct: !!r.correct, rightBin: r.rightBin ?? null });
    reload();
  }

  if (!supabaseConfigured) {
    return (
      <div className="flex flex-col gap-6 md:max-w-3xl">
        <PageTitle title="Missions" />
        <Card>Missions aren&apos;t available right now. Scanning and the guides still work.</Card>
      </div>
    );
  }

  if (noSession) {
    return (
      <div className="flex flex-col gap-6 md:max-w-3xl">
        <PageTitle title="Missions" subtitle="Learn to sort right, earn points" />
        <Card className="flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-ink-2">
            Do 3 short missions a day and 3 a week: scan different items, read the disposal library
            and answer quizzes. Start as a guest; create an account to keep your points.
          </p>
          <Button
            onClick={async () => {
              if (await ensureUserId()) reload();
              else setError("Couldn't start. Check your connection.");
            }}
          >
            <Trophy aria-hidden className="size-4" /> Start missions
          </Button>
          {error ? (
            <p role="alert" className="text-sm text-[#c4282d]">
              {error}
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  const daily = missions?.filter((m) => m.period === "daily") ?? [];
  const weekly = missions?.filter((m) => m.period === "weekly") ?? [];
  const nameOf = (code: string | null) =>
    missions?.find((m) => m.code === code)?.titleEn ?? code ?? "Points";

  return (
    <div className="flex flex-col gap-6 md:max-w-3xl">
      <PageTitle title="Missions" subtitle="Learn to sort right, earn points" />
      <p className="sr-only" role="status" aria-live="polite">
        {note ?? ""}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["Total", points?.total, Trophy],
            ["Today", points?.today, Flame],
            ["This week", points?.week, Gift],
          ] as const
        ).map(([label, value, Icon]) => (
          <Card key={label} className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
              <Icon aria-hidden className="size-3.5" /> {label}
            </span>
            <span className="text-2xl font-bold text-ink tabular-nums">{value ?? "–"}</span>
          </Card>
        ))}
      </div>

      {guest ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-brand-tint p-4 text-sm text-ink">
          <span className="flex items-center gap-2">
            <Lock aria-hidden className="size-4 text-brand-strong" />
            You can do missions as a guest. Create an account to claim points; your progress stays.
          </span>
          <ButtonLink href="/account">Create an account</ButtonLink>
        </div>
      ) : null}

      {note ? (
        <p className="rounded-tile bg-surface p-3 text-sm font-medium text-ink">{note}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-[#c4282d]">
          {error}
        </p>
      ) : null}

      <section
        id="daily"
        aria-labelledby="daily-heading"
        className="flex scroll-mt-24 flex-col gap-3"
      >
        <h2 id="daily-heading" className="text-base font-semibold text-ink">
          Today&apos;s missions{" "}
          <span className="text-sm font-normal text-ink-3">· reset at midnight</span>
        </h2>
        {missions ? (
          <ul className="grid gap-3 md:grid-cols-3">
            {daily.map((m) => (
              <MissionCard
                key={m.code}
                m={m}
                guest={guest}
                fil={fil}
                onClaim={(x) => void claim(x)}
              />
            ))}
          </ul>
        ) : (
          <Skeleton className="h-28" />
        )}
      </section>

      <section aria-labelledby="weekly-heading" className="flex flex-col gap-3">
        <h2 id="weekly-heading" className="text-base font-semibold text-ink">
          This week <span className="text-sm font-normal text-ink-3">· reset on Monday</span>
        </h2>
        {missions ? (
          <ul className="grid gap-3 md:grid-cols-3">
            {weekly.map((m) => (
              <MissionCard
                key={m.code}
                m={m}
                guest={guest}
                fil={fil}
                onClaim={(x) => void claim(x)}
              />
            ))}
          </ul>
        ) : (
          <Skeleton className="h-28" />
        )}
      </section>

      {quiz ? (
        <Card id="daily-quiz" className="flex scroll-mt-24 flex-col gap-3 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <CircleHelp aria-hidden className="size-5 text-brand-strong" /> Today&apos;s question
          </h2>
          <p className="text-sm text-ink">
            Which bin does <strong>{fil ? quiz.nameFil : quiz.nameEn}</strong> go in?
          </p>
          <BinChoices q={quiz} busy={busy} onAnswer={(b) => void answerDaily(b)} />
        </Card>
      ) : null}

      <GroupQuiz fil={fil} onDone={reload} />

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-base font-semibold text-ink">Points history</h2>
        {history.length ? (
          <ul className="flex flex-col divide-y divide-line text-sm">
            {history.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="text-ink">
                    {e.kind === "reversal" ? `Reversed: ${e.reason}` : nameOf(e.mission)}
                  </span>
                  <span className="ml-2 text-xs text-ink-3">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    e.points < 0 ? "text-[#c4282d]" : "text-[#1a7f37]",
                  )}
                >
                  {e.points > 0 ? `+${e.points}` : e.points}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">No points yet. Finish a mission to get started.</p>
        )}
      </Card>

      <Card className="flex flex-col gap-2 p-5 text-sm text-ink-2">
        <h2 className="text-base font-semibold text-ink">How points work</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Everyone gets the same 3 daily and 3 weekly missions. Each pays once.</li>
          <li>At most 30 points a day and 150 a week.</li>
          <li>
            Only different items count, scans need to be a few seconds apart, and quiz questions get
            one try.
          </li>
          <li>Points show what you learned in the app. They have no cash value.</li>
        </ul>
        <p className="text-xs text-ink-3">
          See the{" "}
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>{" "}
          for what is stored.
        </p>
      </Card>
    </div>
  );
}
