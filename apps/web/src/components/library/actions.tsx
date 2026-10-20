// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Check, CirclePlus } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { logLibraryEvent, type LibraryEventSource } from "@/lib/library/client";
import { recordActivity } from "@/lib/points";

const SLOT = "itapon-library-ideas";

function readIdeas(): Record<string, "plan" | "done"> {
  try {
    return JSON.parse(localStorage.getItem(SLOT) ?? "{}") as Record<string, "plan" | "done">;
  } catch {
    return {};
  }
}

/**
 * "I'll do this" / "Done it" on a reuse or reduce idea (Phase 30). Remembered on this device
 * only; the count (no id) feeds the admin dashboard and, later, points (Phases 31–35).
 */
export function IdeaActions({
  slug,
  idea,
  source,
  className,
}: {
  slug: string;
  idea: string;
  source: LibraryEventSource;
  className?: string;
}) {
  const key = `${slug}:${idea}`;
  const [state, setState] = useState<"plan" | "done" | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setState(readIdeas()[key] ?? null));
    return () => clearTimeout(t);
  }, [key]);

  function mark(next: "plan" | "done") {
    setState(next);
    logLibraryEvent(slug, next === "plan" ? "idea_plan" : "idea_done", source);
    recordActivity(next === "plan" ? "idea_plan" : "idea_done", slug, idea); // missions (D26)
    try {
      localStorage.setItem(SLOT, JSON.stringify({ ...readIdeas(), [key]: next }));
    } catch {
      /* private mode */
    }
  }

  const base =
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {state === "done" ? (
        <span
          role="status"
          className={cn(base, "border-transparent bg-bin-green-tint text-[#1a7f37]")}
        >
          <Check aria-hidden className="size-3.5" /> Done. Nice work!
        </span>
      ) : (
        <>
          <button
            type="button"
            aria-pressed={state === "plan"}
            onClick={() => mark("plan")}
            className={cn(
              base,
              state === "plan"
                ? "border-transparent bg-brand-tint text-brand-strong"
                : "border-line bg-white text-ink-2 hover:bg-surface",
            )}
          >
            <CirclePlus aria-hidden className="size-3.5" />
            {state === "plan" ? "On your list" : "I'll do this"}
          </button>
          <button
            type="button"
            onClick={() => mark("done")}
            className={cn(base, "border-line bg-white text-ink-2 hover:bg-surface")}
          >
            <Check aria-hidden className="size-3.5" /> Done it
          </button>
        </>
      )}
    </div>
  );
}

/** Counts one "viewed" per entry and page load. */
export function ViewLogger({ slug, source }: { slug: string; source: LibraryEventSource }) {
  useEffect(() => {
    logLibraryEvent(slug, "view", source);
    if (source === "library") recordActivity("read_entry", slug); // missions (D26)
  }, [slug, source]);
  return null;
}
