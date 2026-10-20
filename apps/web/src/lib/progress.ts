// SPDX-License-Identifier: AGPL-3.0-or-later
// Levels, streaks, badges and leaderboards (ROADMAP-v2 Phase 33; docs/points.md). The server
// computes them; LEVELS mirrors private.level_for() so the app can show progress to the next.
"use client";

import { friendlyError } from "@/lib/accounts";
import { getSupabase } from "@/lib/supabase/client";

export const LEVELS = [
  { from: 0, name: "Seedling" },
  { from: 50, name: "Sprout" },
  { from: 150, name: "Sapling" },
  { from: 300, name: "Sorter" },
  { from: 500, name: "Recycler" },
  { from: 800, name: "Composter" },
  { from: 1200, name: "Eco Guide" },
  { from: 1700, name: "Eco Champion" },
  { from: 2300, name: "Zero-Waste Hero" },
  { from: 3000, name: "Earth Keeper" },
] as const;

/** Level 1–10 for lifetime points, with progress toward the next (pure; tested). */
export function levelInfo(total: number) {
  const idx = LEVELS.reduce((n, l, i) => (total >= l.from ? i : n), 0);
  const next = LEVELS[idx + 1];
  const from = LEVELS[idx].from;
  return {
    level: idx + 1,
    name: LEVELS[idx].name,
    from,
    next: next?.from ?? null,
    pct: next ? Math.floor(((total - from) / (next.from - from)) * 100) : 100, // never 100 early
  };
}

export interface Badge {
  code: string;
  titleEn: string;
  titleFil: string;
  howEn: string;
  howFil: string;
  earnedAt: string | null;
}

export interface BoardRow {
  rank: number;
  handle: string;
  avatar: string | null;
  points: number;
  isMe: boolean;
}

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error("Not available right now.");
  return sb;
}

export async function fetchProgress(): Promise<{ total: number; level: number; streak: number }> {
  const sb = await client();
  const { data, error } = await sb.rpc("my_progress");
  if (error) throw new Error(friendlyError(error));
  const r = data?.[0];
  return { total: Number(r?.total ?? 0), level: r?.level ?? 1, streak: r?.streak ?? 0 };
}

/** Checks for newly earned badges (server-side), then returns all with earned dates. */
export async function fetchBadges(): Promise<{ badges: Badge[]; fresh: string[] }> {
  const sb = await client();
  const fresh = await sb.rpc("refresh_badges");
  const [all, mine] = await Promise.all([
    sb.from("badges").select("code, title_en, title_fil, how_en, how_fil").order("sort_order"),
    sb.from("user_badges").select("badge_code, earned_at"),
  ]);
  if (all.error) throw new Error(friendlyError(all.error));
  const earned = new Map((mine.data ?? []).map((b) => [b.badge_code, b.earned_at]));
  return {
    fresh: fresh.error ? [] : (fresh.data ?? []),
    badges: (all.data ?? []).map((b) => ({
      code: b.code,
      titleEn: b.title_en,
      titleFil: b.title_fil,
      howEn: b.how_en,
      howFil: b.how_fil,
      earnedAt: earned.get(b.code) ?? null,
    })),
  };
}

export async function fetchLeaderboard(period: "week" | "month"): Promise<BoardRow[]> {
  const sb = await client();
  const { data, error } = await sb.rpc("institution_leaderboard", { p_period: period });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).map((r) => ({
    rank: Number(r.rank),
    handle: r.handle,
    avatar: r.avatar,
    points: Number(r.points),
    isMe: r.is_me,
  }));
}

export async function setLeaderboardHidden(userId: string, hidden: boolean): Promise<void> {
  const sb = await client();
  const { error } = await sb.rpc("admin_set_leaderboard_hidden", {
    p_user: userId,
    p_hidden: hidden,
  });
  if (error) throw new Error(friendlyError(error));
}
