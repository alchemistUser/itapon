// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";

const noopSubscribe = () => () => {};

/**
 * Speaks `text` with the Web Speech API. Phase 17 adds voice/language choice and
 * auto-play; this is the basic, working version used by every result screen.
 */
export function ReadAloudButton({
  text,
  variant = "plain",
  className,
}: {
  text: string;
  variant?: "plain" | "outline";
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  // Browser-only capability: false during SSR, real value after hydration (no mismatch).
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false,
  );

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function toggle() {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
    u.onend = u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
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
