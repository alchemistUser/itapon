// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { DEFAULT_MODEL_ID, LABELS_FILE, MODELS, PINNED_SHA256 } from "./models";

describe("model integrity pins (Phase 22)", () => {
  it("pins the default model and the labels file", () => {
    expect(PINNED_SHA256[MODELS[DEFAULT_MODEL_ID].file]).toMatch(/^[0-9a-f]{64}$/);
    expect(PINNED_SHA256[LABELS_FILE]).toMatch(/^[0-9a-f]{64}$/);
  });
});
