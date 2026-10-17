// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { normalizeSupabaseUrl } from "./client";

describe("normalizeSupabaseUrl", () => {
  it("accepts a full URL, with or without a trailing slash", () => {
    expect(normalizeSupabaseUrl("https://svvbvkdkgduyphkkaiio.supabase.co/")).toBe(
      "https://svvbvkdkgduyphkkaiio.supabase.co",
    );
  });
  it("turns a bare project ref into the project URL", () => {
    expect(normalizeSupabaseUrl(" svvbvkdkgduyphkkaiio ")).toBe(
      "https://svvbvkdkgduyphkkaiio.supabase.co",
    );
  });
  it("rejects empty or invalid values", () => {
    expect(normalizeSupabaseUrl(undefined)).toBeNull();
    expect(normalizeSupabaseUrl("not a url")).toBeNull();
    expect(normalizeSupabaseUrl("ftp://example.com")).toBeNull();
  });
});
