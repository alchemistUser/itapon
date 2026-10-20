// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { formatCode } from "@/components/admin/members-panel";

import { friendlyError, handleCooldownDays, handleHint, isMinor, scansToCsv } from "./accounts";

describe("isMinor (conservative: adult from 1 Jan of birth year + 19)", () => {
  const now = new Date("2026-10-21T08:00:00+08:00");
  it.each([
    [null, true],
    [2010, true],
    [2008, true], // turns 18 in 2026: could still be 17
    [2007, false],
    [1990, false],
  ])("%s → %s", (year, minor) => expect(isMinor(year, now)).toBe(minor));

  it("uses the Manila calendar year", () => {
    // 31 Dec 2026 17:00 UTC is already 1 Jan 2027 in Manila
    expect(isMinor(2008, new Date("2026-12-31T17:00:00Z"))).toBe(false);
  });
});

describe("handleHint", () => {
  it.each([
    ["green_juan", null],
    ["ab", "Use 3 to 20 lowercase letters, numbers or _"],
    ["has space", "Use 3 to 20 lowercase letters, numbers or _"],
    ["x".repeat(21), "Use 3 to 20 lowercase letters, numbers or _"],
    ["admin", "That handle is reserved"],
    ["  Green_Juan ", null], // trimmed and lowercased
  ])("%s", (h, hint) => expect(handleHint(h)).toBe(hint));
});

describe("handleCooldownDays", () => {
  const now = new Date("2026-10-21T00:00:00Z");
  it("is free for the first handle", () => expect(handleCooldownDays(null, false, now)).toBe(0));
  it("counts down 30 days after a change", () => {
    expect(handleCooldownDays("2026-10-20T00:00:00Z", true, now)).toBe(29);
    expect(handleCooldownDays("2026-09-01T00:00:00Z", true, now)).toBe(0);
  });
});

describe("scansToCsv", () => {
  it("writes one row per detection and quotes commas", () => {
    const csv = scansToCsv({
      exported_at: "x",
      scans: [
        {
          id: "s1",
          created_at: "2026-10-21T01:00:00Z",
          source: "mobile",
          model_version: "v1, beta",
          detections: [
            { class_key: "battery", bin: "hazardous", confidence: 0.9, is_primary: true },
            { class_key: "straw", bin: "residual", confidence: 0.4, is_primary: false },
          ],
        },
      ],
    });
    expect(csv.trim().split("\n")).toEqual([
      "scan_id,scanned_at,source,model_version,item,bin,confidence,main_item",
      's1,2026-10-21T01:00:00Z,mobile,"v1, beta",battery,hazardous,0.9,yes',
      's1,2026-10-21T01:00:00Z,mobile,"v1, beta",straw,residual,0.4,no',
    ]);
  });
});

describe("friendlyError", () => {
  it("shows our own server messages and hides others", () => {
    expect(
      friendlyError({ code: "42501", message: "You can change your handle once every 30 days" }),
    ).toBe("You can change your handle once every 30 days");
    expect(friendlyError({ code: "23505", message: "duplicate key" })).toBe(
      "That handle is taken.",
    );
    expect(friendlyError({ code: "XX000", message: "internal" })).toMatch(/Couldn't save/);
  });
});

it("formats join codes for reading", () => expect(formatCode("ABCD2345")).toBe("ABCD-2345"));
