// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { CODE_RE } from "@/components/evaluate/knowledge-test";

import { knowledgeCsv, knowledgeSummary, returnRate, type KnowledgeRow } from "./admin-v2";

const row = (code: string, form: "pre" | "post", score: number): KnowledgeRow => ({
  code,
  form,
  score,
  total: 12,
  createdAt: "",
});

describe("knowledgeSummary", () => {
  it("pairs pre and post by participant code", () => {
    const s = knowledgeSummary([
      row("P01", "pre", 6),
      row("P01", "post", 10),
      row("P02", "pre", 8),
      row("P02", "post", 9),
      row("P03", "pre", 4), // no post yet
    ]);
    expect(s).toEqual({ pre: 3, post: 2, paired: 2, meanPre: 7, meanPost: 9.5, meanGain: 2.5 });
  });
  it("has no means without pairs", () => {
    expect(knowledgeSummary([row("P01", "pre", 6)]).meanGain).toBeNull();
  });
});

it("writes knowledge.csv for pilot_report.py", () => {
  expect(knowledgeCsv([row("P01", "pre", 6)])).toBe(
    "participant_id,form,score,total\nP01,pre,6,12\n",
  );
});

it("return rate is the share of last period's players who came back", () => {
  expect(returnRate({ previousPlayers: 4, returningPlayers: 3 })).toBe(0.75);
  expect(returnRate({ previousPlayers: 0, returningPlayers: 0 })).toBeNull();
});

it.each([
  ["P07", true],
  ["P123", true],
  ["p07", false],
  ["Juan", false],
  ["P1", false],
])("participant code %s is %s", (code, ok) => expect(CODE_RE.test(code)).toBe(ok));
