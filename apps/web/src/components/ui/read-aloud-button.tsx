// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import { usePrefs } from "@/lib/prefs";
import { partsFor, speak, speechSupported, stopSpeaking, type SpeechItem } from "@/lib/speech";

const noopSubscribe = () => () => {};

/**
 * Read aloud (Phase 17): speaks a result in the user's language preference (English, or
 * Filipino + English), with a visible playing state and a stop button.
 * Pass `item` for a result, or `text` for anything else.
 */
export function ReadAloudButton({
  item,
  text,
  variant = "plain",
  className,
}: {
  item?: SpeechItem;
  text?: string;
  variant?: "plain" | "outline";
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const prefs = usePrefs();
  // Browser-only capability: false during SSR, real value after hydration (no mismatch).
  const supported = useSyncExternalStore(noopSubscribe, speechSupported, () => false);

  useEffect(() => () => stopSpeaking(), []);

  function toggle() {
    if (!supported) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const parts = item
      ? partsFor(item, prefs.language)
      : [{ text: text ?? "", lang: "en" as const }];
    setSpeaking(true);
    speak(parts, () => setSpeaking(false));
  }

  const Icon = speaking ? Square : Volume2;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      disabled={!supported}
      className={cn(
        "inline-flex items-center gap-2 text-sm font-semibold text-ink disabled:opacity-50",
        variant === "outline" &&
          "h-11 rounded-control border border-ink-4/60 bg-white px-4 hover:bg-surface",
        variant === "plain" && "min-h-11",
        className,
      )}
    >
      <Icon aria-hidden className="size-4" />
      {speaking ? "Stop reading" : "Read aloud"}
    </button>
  );
}
