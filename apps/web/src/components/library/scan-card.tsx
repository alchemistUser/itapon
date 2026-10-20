// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { ArrowRight, Info, MapPin, Repeat2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/detector/types";
import {
  candidatesFor,
  chooserTip,
  itemPath,
  LGU_NAMES,
  nameOf,
  pick,
  rulesFor,
  topIdea,
  VALUE_LINE,
  whereElse,
} from "@/lib/library/core";
import {
  loadLibraryItem,
  logLibraryEvent,
  useLibraryIndex,
  type LibraryEventSource,
} from "@/lib/library/client";
import type { LibraryItem } from "@/lib/library/types";
import { usePrefs } from "@/lib/prefs";

import { IdeaActions } from "./actions";

/**
 * Post-scan card (Phase 30), under the bin result: "Which one is yours?" when the scanner
 * class covers several library items (e.g. plastic bottle → PET water, HDPE shampoo, cooking
 * oil), then that item's "where else", top reuse/reduce idea and local rule, and a link to
 * its full entry. Renders nothing until the library has a published entry for the class.
 */
export function LibraryScanCard({
  classKey,
  category,
  compact = false,
  source = "scan",
  className,
}: {
  classKey: string;
  category: Category;
  compact?: boolean;
  source?: LibraryEventSource;
  className?: string;
}) {
  const index = useLibraryIndex();
  const lang = usePrefs().language ?? "en";
  const cands = useMemo(
    () => (index ? candidatesFor(index.items, classKey) : []),
    [index, classKey],
  );
  const [picked, setPicked] = useState<{ classKey: string; slug: string } | null>(null);
  const chosenSlug =
    picked?.classKey === classKey && cands.some((c) => c.slug === picked.slug)
      ? picked.slug
      : cands[0]?.slug;
  const [loaded, setLoaded] = useState<LibraryItem | null>(null);
  const item = loaded?.slug === chosenSlug ? loaded : null;

  useEffect(() => {
    if (!chosenSlug) return;
    let live = true;
    void loadLibraryItem(chosenSlug).then((it) => {
      if (!live || !it) return;
      setLoaded(it);
      logLibraryEvent(it.slug, "view", source);
    });
    return () => {
      live = false;
    };
  }, [chosenSlug, source]);

  if (!index || !cands.length) return null;
  const chosen = cands.find((c) => c.slug === chosenSlug)!;
  const otherBin = chosen.bin !== category ? BINS[chosen.bin] : null;
  const value = item?.value ? VALUE_LINE[item.value] : undefined;
  // "Junk shops buy this" already covers the junk shop
  const others = item
    ? whereElse(item, index.destinations, lang).filter((d) => !(value && d.code === "junkshop"))
    : [];
  const idea = item ? topIdea(item, lang) : null;
  const rule = item ? rulesFor(index.local_rules, item)[0] : undefined;

  return (
    <section
      aria-label="More about this item"
      className={cn(
        "flex flex-col gap-3 rounded-tile border border-line bg-white text-left text-ink",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      {cands.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">Which one is yours?</legend>
          <p className="-mt-1 text-xs text-ink-3">{chooserTip(cands)}</p>
          <div className="flex flex-wrap gap-2">
            {cands.map((c) => (
              <button
                key={c.slug}
                type="button"
                aria-pressed={c.slug === chosenSlug}
                onClick={() => {
                  if (c.slug === chosenSlug) return;
                  setPicked({ classKey, slug: c.slug });
                  logLibraryEvent(c.slug, "chooser", source);
                }}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold",
                  c.slug === chosenSlug
                    ? "border-transparent bg-brand-button text-white"
                    : "border-line bg-white text-ink-2 hover:bg-surface",
                )}
              >
                {nameOf(c, lang)}
                {c.resin_code ? ` #${c.resin_code}` : ""}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {otherBin ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-tile bg-bin-red-tint/60 p-2.5 text-sm"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-[#c4282d]" />
          <span>
            <span className="font-semibold">{nameOf(chosen, lang)}</span> goes in the{" "}
            <span className={cn("font-semibold", otherBin.text)}>{otherBin.binLabel}</span> instead.
          </span>
        </p>
      ) : null}

      {item ? (
        <>
          {/* the result above already shows the main item's instruction */}
          {chosen.slug !== cands[0].slug || otherBin ? (
            <p className="text-sm text-ink-2">{pick(lang, item.summary_en, item.summary_fil)}</p>
          ) : null}
          {value || others.length ? (
            <p className="flex items-start gap-2 text-sm">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-strong" />
              <span>
                {value ? `${value} ` : ""}
                {others.length ? (
                  <>
                    <span className="text-ink-3">Also: </span>
                    {others.map((d) => d.name_en).join(", ")}
                  </>
                ) : null}
              </span>
            </p>
          ) : null}
          {idea ? (
            <div className="flex flex-col gap-1.5">
              <p className="flex items-start gap-2 text-sm">
                <Repeat2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-strong" />
                <span>
                  <span className="text-ink-3">
                    {idea.kind === "reuse" ? "Reuse: " : "Reduce: "}
                  </span>
                  {idea.text}
                </span>
              </p>
              {compact ? null : (
                <IdeaActions
                  slug={item.slug}
                  idea={idea.kind === "reuse" ? item.reuse_en[0] : item.reduce_en[0]}
                  source={source}
                  className="pl-6"
                />
              )}
            </div>
          ) : null}
          {rule ? (
            <p className="flex items-start gap-2 text-sm">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
              <span>
                <span className="font-semibold">
                  {rule.lgu ? (LGU_NAMES[rule.lgu] ?? rule.lgu) : "Your campus"}:{" "}
                </span>
                {pick(lang, rule.note_en, rule.note_fil).replace(/^In Quezon City:\s*/i, "")}
              </span>
            </p>
          ) : null}
        </>
      ) : null}

      <Link
        href={itemPath(chosen.slug)}
        className="inline-flex min-h-9 items-center gap-1 self-start text-sm font-semibold text-brand-strong underline"
      >
        How to dispose of {nameOf(chosen, lang).toLowerCase()}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </section>
  );
}
