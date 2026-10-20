// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { authMessage, MIN_PASSWORD } from "./auth";

describe("authMessage", () => {
  it.each([
    ["User already registered", /already has an iTapon account/],
    ["A user with this email address has already been registered", /already has an iTapon account/],
    ["Invalid login credentials", /Wrong email or password/],
    ["Unable to validate email address: invalid format", /valid email/],
    ["Password should be at least 6 characters.", new RegExp(`at least ${MIN_PASSWORD}`)],
    ["Email rate limit exceeded", /Too many tries/],
    ["Something else", /Something else/],
  ])("%s", (raw, expected) => expect(authMessage(raw)).toMatch(expected));
});
