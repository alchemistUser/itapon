// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LEVELS, levelInfo } from "./progress";

describe("levelInfo", () => {
  it.each([
    [0, 1, "Seedling", 0],
    [49, 1, "Seedling", 98],
    [50, 2, "Sprout", 0],
    [499, 4, "Sorter", 99],
    [500, 5, "Recycler", 0],
    [3000, 10, "Earth Keeper", 100],
    [99999, 10, "Earth Keeper", 100],
  ])("%i points → level %i %s (%i%%)", (total, level, name, pct) => {
    expect(levelInfo(total)).toMatchObject({ level, name, pct });
  });

  it("matches the server's level table (private.level_for)", () => {
    const sql = readFileSync(
      join(__dirname, "../../../../supabase/migrations/20261021210000_progress_leaderboards.sql"),
      "utf-8",
    );
    const server = sql
      .match(/unnest\(array\[([0-9, ]+)\]\)/)?.[1]
      .split(",")
      .map(Number);
    expect(server).toEqual(LEVELS.map((l) => l.from));
  });
});
