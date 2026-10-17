// SPDX-License-Identifier: AGPL-3.0-or-later
import { BookOpen, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BinTile } from "@/components/bins/bins";
import { GuideSearch } from "@/components/guide/guide-search";
import { ButtonLink } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/primitives";
import { BIN_ORDER, BINS } from "@/lib/bins";
import { ITEMS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Bin Guide",
  description:
    "What goes where: biodegradable, recyclable, residual and hazardous waste, with how to prepare each item. Search in English or Filipino.",
};

// S3 Bin Guide (Phase 15): fuzzy search + the four bins, each linking to its item list.
// Prerendered from the bundled content; search refreshes from Supabase in the browser.
export default function GuidePage() {
  const counts = Object.fromEntries(
    BIN_ORDER.map((k) => [k, ITEMS.filter((i) => i.category === k).length]),
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle title="Bin Guide" subtitle="What goes where" />
        <GuideSearch className="md:w-96" />
      </div>

      <ul className="grid gap-3 md:grid-cols-2 md:gap-5">
        {BIN_ORDER.map((key) => {
          const bin = BINS[key];
          return (
            <li key={key}>
              <Link
                href={`/guide/${key}`}
                className="flex h-full items-start gap-4 rounded-card bg-card p-4 shadow-card transition-shadow hover:ring-1 hover:ring-line md:p-6"
              >
                <BinTile category={key} size="lg" className="size-16 md:size-20" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-ink md:text-lg">
                    {bin.name}
                  </span>
                  <span className="block text-xs text-ink-3 md:text-sm">{bin.binLabel}</span>
                  <span className="mt-1 block text-sm text-ink-2">{bin.examples}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
                    See all {counts[key]} items <ChevronRight aria-hidden className="size-3.5" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between md:bg-transparent md:p-0 md:shadow-none">
        <div className="flex items-start gap-3">
          <BookOpen aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-strong" />
          <div>
            <p className="text-sm font-semibold text-ink">Not sure where an item belongs?</p>
            <p className="text-xs text-ink-3">Scan it to get a sorting suggestion.</p>
          </div>
        </div>
        <ButtonLink href="/scan" variant="dark">
          Scan an item
        </ButtonLink>
      </div>
    </div>
  );
}
