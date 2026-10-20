// SPDX-License-Identifier: AGPL-3.0-or-later
// Points (ROADMAP-v2 Phase 32, D26; rules in docs/points.md). The server computes missions,
// progress and awards; this file only calls it. Library activity is recorded for whoever is
// signed in (guests too, so their progress carries over when they create an account), but it
// never creates an account by itself.
"use client";

import { friendlyError } from "@/lib/accounts";
import type { Category } from "@/lib/detector/types";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

export interface Mission {
  code: string;
  period: "daily" | "weekly";
  periodKey: string;
  titleEn: string;
  titleFil: string;
  target: number;
  points: number;
  progress: number;
  claimed: boolean;
  blocked: boolean;
}

export interface QuizQuestion {
  quizKey: string;
  slug: string;
  nameEn: string;
  nameFil: string;
  myAnswer: Category | null;
  correct: boolean | null;
  rightBin: Category | null;
}

export interface PointEvent {
  id: number;
  kind: "award" | "reversal";
  mission: string | null;
  points: number;
  reason: string | null;
  createdAt: string;
}

/** Where to go to make progress on a mission. */
export const MISSION_LINKS: Record<string, { href: string; label: string }> = {
  scan_kinds: { href: "/scan", label: "Scan" },
  all_bins: { href: "/scan", label: "Scan" },
  read_entry: { href: "/library", label: "Open the library" },
  three_groups: { href: "/library", label: "Open the library" },
  daily_quiz: { href: "#daily-quiz", label: "Answer below" },
  group_quiz: { href: "#group-quiz", label: "Take a quiz below" },
  use_chooser: { href: "/scan", label: "Scan a bottle or battery" },
  plan_idea: { href: "/library", label: "Find an idea" },
  two_done: { href: "/library", label: "Find an idea" },
  five_dailies: { href: "#daily", label: "See today's missions" },
};

/** "Claim" is possible when the server says the mission is complete (pure; tested). */
export function claimable(m: Mission, guest: boolean, paused = false): boolean {
  return !guest && !paused && !m.claimed && !m.blocked && m.progress >= m.target;
}

/** Feature flags (Phase 35): points can be paused for everyone or by an institution. */
export async function fetchPointsStatus(): Promise<{
  enabled: boolean;
  reason: "paused" | "institution" | null;
}> {
  const sb = await client();
  const { data, error } = await sb.rpc("points_status");
  if (error) throw new Error(friendlyError(error));
  const r = data?.[0];
  return {
    enabled: r?.enabled ?? true,
    reason: (r?.reason as "paused" | "institution" | null) ?? null,
  };
}

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error("Points aren't available right now.");
  return sb;
}

export async function fetchMissions(): Promise<Mission[]> {
  const sb = await client();
  const { data, error } = await sb.rpc("mission_status");
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).map((m) => ({
    code: m.code,
    period: m.period as Mission["period"],
    periodKey: m.period_key,
    titleEn: m.title_en,
    titleFil: m.title_fil,
    target: m.target,
    points: m.points,
    progress: m.progress,
    claimed: m.claimed,
    blocked: m.blocked,
  }));
}

export async function claimMission(code: string): Promise<{ points?: number; error?: string }> {
  const sb = await client();
  const { data, error } = await sb.rpc("claim_mission", { p_code: code });
  if (error) {
    return { error: error.code === "23505" ? "Already claimed." : friendlyError(error) };
  }
  return { points: data?.[0]?.points };
}

export async function fetchPoints(): Promise<{ total: number; today: number; week: number }> {
  const sb = await client();
  const { data, error } = await sb.rpc("my_points");
  if (error) throw new Error(friendlyError(error));
  const r = data?.[0];
  return {
    total: Number(r?.total ?? 0),
    today: Number(r?.today ?? 0),
    week: Number(r?.this_week ?? 0),
  };
}

export async function fetchPointHistory(): Promise<PointEvent[]> {
  const sb = await client();
  const { data, error } = await sb
    .from("point_events")
    .select("id, kind, mission_code, points, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind as PointEvent["kind"],
    mission: e.mission_code,
    points: e.points,
    reason: e.reason,
    createdAt: e.created_at,
  }));
}

type QuizRow = {
  quiz_key: string;
  item_slug: string;
  name_en: string;
  name_fil: string;
  my_answer: string | null;
  correct: boolean | null;
  right_bin: string | null;
};
const toQuestion = (r: QuizRow): QuizQuestion => ({
  quizKey: r.quiz_key,
  slug: r.item_slug,
  nameEn: r.name_en,
  nameFil: r.name_fil,
  myAnswer: (r.my_answer as Category | null) ?? null,
  correct: r.correct,
  rightBin: (r.right_bin as Category | null) ?? null,
});

export async function fetchDailyQuiz(): Promise<QuizQuestion | null> {
  const sb = await client();
  const { data, error } = await sb.rpc("daily_quiz");
  if (error) throw new Error(friendlyError(error));
  return data?.[0] ? toQuestion(data[0]) : null;
}

export async function fetchGroupQuiz(group: string): Promise<QuizQuestion[]> {
  const sb = await client();
  const { data, error } = await sb.rpc("group_quiz", { p_group: group });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).map(toQuestion);
}

export async function answerQuiz(
  q: QuizQuestion,
  answer: Category,
): Promise<{ correct?: boolean; rightBin?: Category; error?: string }> {
  const sb = await client();
  const { data, error } = await sb.rpc("answer_quiz", {
    p_key: q.quizKey,
    p_slug: q.slug,
    p_answer: answer,
  });
  if (error) {
    return { error: error.code === "23505" ? "Already answered." : friendlyError(error) };
  }
  const r = data?.[0];
  return { correct: r?.correct ?? false, rightBin: (r?.right_bin as Category) ?? undefined };
}

/** Group quiz score: answered, right, passed (4 of 5) (pure; tested). */
export function quizScore(qs: QuizQuestion[]) {
  const answered = qs.filter((q) => q.myAnswer).length;
  const right = qs.filter((q) => q.correct).length;
  return { answered, right, passed: right >= 4, done: qs.length > 0 && answered === qs.length };
}

const recorded = new Set<string>();

/**
 * Library activity that missions count. Only when a session already exists (guest or
 * account); fire-and-forget; once per kind, item and idea per page load.
 */
export function recordActivity(
  kind: "read_entry" | "chooser" | "idea_plan" | "idea_done",
  slug: string,
  detail?: string,
) {
  if (!supabaseConfigured || typeof window === "undefined") return;
  const key = `${kind}:${slug}:${detail ?? ""}`;
  if (recorded.has(key)) return;
  recorded.add(key);
  void getSupabase()
    .then(async (sb) => {
      if (!sb || !(await sb.auth.getSession()).data.session) return;
      await sb.rpc("record_activity", { p_kind: kind, p_slug: slug, p_detail: detail });
    })
    .catch(() => recorded.delete(key));
}
