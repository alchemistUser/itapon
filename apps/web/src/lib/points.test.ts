// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { pointsByMember } from "@/components/admin/points-panel";

import { claimable, MISSION_LINKS, quizScore, type Mission, type QuizQuestion } from "./points";

const mission = (over: Partial<Mission> = {}): Mission => ({
  code: "read_entry",
  period: "daily",
  periodKey: "2026-10-21",
  titleEn: "Read",
  titleFil: "Basa",
  target: 1,
  points: 10,
  progress: 1,
  claimed: false,
  blocked: false,
  ...over,
});

describe("claimable", () => {
  it("needs a finished, unclaimed, unblocked mission and an account", () => {
    expect(claimable(mission(), false)).toBe(true);
    expect(claimable(mission(), true)).toBe(false); // guest
    expect(claimable(mission({ progress: 0 }), false)).toBe(false);
    expect(claimable(mission({ claimed: true }), false)).toBe(false);
    expect(claimable(mission({ blocked: true }), false)).toBe(false);
  });
});

describe("quizScore", () => {
  const q = (correct: boolean | null): QuizQuestion => ({
    quizKey: "group:PLA:2026-W43",
    slug: String(Math.random()),
    nameEn: "x",
    nameFil: "x",
    myAnswer: correct === null ? null : "recyclable",
    correct,
    rightBin: null,
  });
  it("passes with 4 of 5 once all are answered", () => {
    expect(quizScore([q(true), q(true), q(true), q(true), q(false)])).toEqual({
      answered: 5,
      right: 4,
      passed: true,
      done: true,
    });
    expect(quizScore([q(true), q(true), q(false), q(false), q(null)])).toMatchObject({
      done: false,
      passed: false,
    });
    expect(quizScore([]).done).toBe(false);
  });
});

it("every mission in docs/points.md has a place to do it", () => {
  for (const code of [
    "scan_kinds",
    "read_entry",
    "daily_quiz",
    "use_chooser",
    "plan_idea",
    "all_bins",
    "five_dailies",
    "group_quiz",
    "three_groups",
    "two_done",
  ]) {
    expect(MISSION_LINKS[code]?.href).toBeTruthy();
  }
});

it("totals points per member, reversals included", () => {
  const e = (userId: string, points: number) => ({
    id: Math.random(),
    userId,
    mission: "x",
    points,
    kind: (points < 0 ? "reversal" : "award") as "award" | "reversal",
    reverses: null,
    createdAt: "",
  });
  expect(pointsByMember([e("a", 10), e("b", 50), e("a", 10), e("b", -50)])).toEqual([
    ["a", 20],
    ["b", 0],
  ]);
});
