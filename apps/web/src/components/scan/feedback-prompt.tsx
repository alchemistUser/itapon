// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// "Was this right?" under a locked result (Phase 20). Yes is one tap. No asks for the right
// item (searchable, same fuzzy search as the Bin Guide) and offers an opt-in photo share.
import { Check, Search, ThumbsDown, ThumbsUp } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { BinTile } from "@/components/bins/bins";
import { Button } from "@/components/ui/button";
import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import { useItems } from "@/lib/content-store";
import { submitFeedback } from "@/lib/feedback";
import { createItemSearch } from "@/lib/search";

type Step = "ask" | "correct" | "sending" | "done";

const NOT_LISTED = "__not_listed__";

export function FeedbackPrompt({
  classKey,
  detectionId,
  modelVersion,
  photo,
  className,
}: {
  classKey: string;
  detectionId: string;
  modelVersion: string;
  photo: Blob | null;
  className?: string;
}) {
  const items = useItems();
  const search = useMemo(() => createItemSearch(items), [items]);
  const [step, setStep] = useState<Step>("ask");
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = useId();

  const matches = (query.trim().length >= 2 ? search(query, 6) : []).filter(
    (i) => i.classKey !== classKey,
  );
  const chosen = choice && choice !== NOT_LISTED ? items.find((i) => i.classKey === choice) : null;

  async function send(isCorrect: boolean) {
    setStep("sending");
    setError(null);
    const r = await submitFeedback({
      detectionId,
      isCorrect,
      correctedClassKey: isCorrect || choice === NOT_LISTED ? null : choice,
      modelVersion,
      consent: !isCorrect && consent,
      photo: !isCorrect && consent ? photo : null,
    });
    if (r.error) {
      setError(r.error);
      setStep(isCorrect ? "ask" : "correct");
    } else setStep("done");
  }

  if (step === "done") {
    return (
      <p
        role="status"
        className={cn("flex items-center gap-2 rounded-tile bg-surface p-3 text-sm", className)}
      >
        <Check aria-hidden className="size-4 text-brand-strong" />
        Thanks! Your answer helps improve iTapon.
      </p>
    );
  }

  if (step === "ask" || (step === "sending" && choice === null)) {
    return (
      <div
        className={cn("flex flex-wrap items-center gap-2 text-sm", className)}
        role="group"
        aria-labelledby={`${ids}-q`}
      >
        <span id={`${ids}-q`} className="mr-1 font-medium text-ink-2">
          Was this right?
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={step === "sending"}
          onClick={() => send(true)}
        >
          <ThumbsUp aria-hidden className="size-4" /> Yes
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={step === "sending"}
          onClick={() => setStep("correct")}
        >
          <ThumbsDown aria-hidden className="size-4" /> No
        </Button>
        {error ? (
          <p role="alert" className="w-full text-xs text-[#c4282d]">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-3 rounded-tile bg-surface p-3 text-sm", className)}
      aria-labelledby={`${ids}-h`}
      onSubmit={(e) => {
        e.preventDefault();
        if (choice) void send(false);
      }}
    >
      <p id={`${ids}-h`} className="font-semibold text-ink">
        What is it really?
      </p>
      <label className="relative block">
        <span className="sr-only">Search items</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-4"
        />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. bote, battery, cup"
          className="h-10 w-full rounded-control border border-line bg-white pr-3 pl-9 text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
        />
      </label>
      <ul className="flex flex-col gap-1" aria-label="Choose the right item">
        {matches.map((i) => (
          <li key={i.classKey}>
            <button
              type="button"
              aria-pressed={choice === i.classKey}
              onClick={() => setChoice(i.classKey)}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-control px-2 text-left hover:bg-white",
                choice === i.classKey && "bg-white ring-2 ring-brand",
              )}
            >
              <BinTile category={i.category} size="sm" />
              <span className="flex-1 text-ink">{i.name}</span>
              <span className="text-xs text-ink-3">{BINS[i.category].shortName}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-pressed={choice === NOT_LISTED}
            onClick={() => setChoice(NOT_LISTED)}
            className={cn(
              "flex min-h-11 w-full items-center rounded-control px-2 text-left text-ink-2 hover:bg-white",
              choice === NOT_LISTED && "bg-white ring-2 ring-brand",
            )}
          >
            Something else, or not trash
          </button>
        </li>
      </ul>
      {chosen ? (
        <p className="text-xs text-ink-3">
          {chosen.name} goes in the {BINS[chosen.category].name.toLowerCase()} bin.
        </p>
      ) : null}
      {photo ? (
        <label className="flex items-start gap-2 text-ink-2">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-brand"
          />
          <span>
            Share this photo anonymously to help improve iTapon.{" "}
            <span className="text-xs text-ink-3">
              Only the photo and your answer are sent, and the photo is deleted after 12 months.
              Delete them any time in Account.{" "}
              <a href="/privacy" target="_blank" className="underline">
                Privacy
              </a>
            </span>
          </span>
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-[#c4282d]">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!choice || step === "sending"}>
          {step === "sending" ? "Sending…" : "Send"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setChoice(null);
            setStep("ask");
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
