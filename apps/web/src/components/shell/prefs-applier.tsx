// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { usePrefs } from "@/lib/prefs";

/** Subscribing loads saved preferences and applies them (text size) on every page. */
export function PrefsApplier() {
  usePrefs();
  return null;
}
