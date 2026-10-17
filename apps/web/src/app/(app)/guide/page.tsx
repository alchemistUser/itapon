// SPDX-License-Identifier: AGPL-3.0-or-later
import { BookOpen } from "lucide-react";
import type { Metadata } from "next";

import { BinTile } from "@/components/bins/bins";
import { ButtonLink } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/misc";
import { PageTitle } from "@/components/ui/primitives";
import { BIN_ORDER, BINS } from "@/lib/bins";

export const metadata: Metadata = { title: "Bin Guide" };

// S3 Bin Guide. Static categories; Phase 15 adds Supabase items, search and detail pages.
export default function GuidePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle title="Bin Guide" subtitle="What goes where" />
        <SearchInput placeholder="Search an item e.g. straw" className="md:w-80" />
      </div>

      <ul className="grid gap-3 md:grid-cols-2 md:gap-5">
        {BIN_ORDER.map((key) => {
          const bin = BINS[key];
          return (
            <li key={key}>
              <article className="flex h-full items-start gap-4 rounded-card bg-card p-4 shadow-card md:p-6">
                <BinTile category={key} size="lg" className="size-16 md:size-20" />
                <div>
                  <h2 className="text-base font-semibold text-ink md:text-lg">{bin.name}</h2>
                  <p className="text-xs text-ink-3 md:text-sm">{bin.binLabel}</p>
                  <p className="mt-1 text-sm text-ink-2">{bin.examples}</p>
                </div>
              </article>
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
