// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { browserLabel, scrub } from "./monitoring";

describe("error reporting privacy (Phase 24)", () => {
  it("drops query strings, fragments and JWTs", () => {
    const msg =
      "Failed https://x.supabase.co/storage/v1/object/sign/a.jpg?token=abc123&x=1 at https://itapon.app/scan#frag token eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.c2lnbmF0dXJlMTIz";
    expect(scrub(msg, 500)).toBe(
      "Failed https://x.supabase.co/storage/v1/object/sign/a.jpg at https://itapon.app/scan token [jwt]",
    );
    expect(scrub("x".repeat(900), 500)).toHaveLength(500);
  });

  it("keeps only a coarse browser label", () => {
    expect(
      browserLabel(
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome 141 / Android");
    expect(
      browserLabel(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari 18 / iOS");
    expect(
      browserLabel(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
      ),
    ).toBe("Edge 141 / Windows");
  });
});
