// SPDX-License-Identifier: AGPL-3.0-or-later
import { BookOpen, ChevronRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Bi, LangToggle } from "@/components/library/lang";
import { LibrarySearch } from "@/components/library/library-search";
import { EmptyState, Note, PageTitle } from "@/components/ui/primitives";
import { groupsOf, itemsIn, materialPath } from "@/lib/library/core";
import { LIBRARY } from "@/lib/library/server";

export const metadata: Metadata = {
  title: "Disposal library",
  description:
    "How to dispose of specific items, by material: plastics by resin code, paper, metals, glass, e-waste, batteries and more. In English and Filipino.",
};

// Library home (Phase 30): search + the 16 material groups. Prerendered from the server copy.
export default function LibraryPage() {
  const groups = groupsOf(LIBRARY.materials).map((g) => ({
    ...g,
    count: itemsIn(LIBRARY.items, g.code).length,
  }));
  const total = LIBRARY.items.length;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/guide"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-brand-strong"
      >
        <BookOpen aria-hidden className="size-4" /> Bin Guide
      </Link>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle
          title="Disposal library"
          subtitle={total ? `${total} items by material` : "Item-by-item disposal guide"}
        />
        <LangToggle className="self-start md:self-auto" />
      </div>

      {total ? (
        <LibrarySearch className="md:max-w-xl" />
      ) : (
        <EmptyState icon={<BookOpen aria-hidden className="size-8" />} title="Coming soon">
          The iTapon team is reviewing the first library entries. Until then, the Bin Guide covers
          the common items.
        </EmptyState>
      )}

      <section aria-labelledby="materials-heading" className="flex flex-col gap-3">
        <h2 id="materials-heading" className="text-base font-semibold text-ink">
          Browse by material
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.code}>
              <Link
                href={materialPath(g.code)}
                className="flex h-full items-start gap-3 rounded-card bg-card p-4 shadow-card transition-shadow hover:ring-1 hover:ring-line"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">
                    <Bi en={g.name_en} fil={g.name_fil} />
                  </span>
                  {g.description_en ? (
                    <span className="mt-1 block text-sm text-ink-3">
                      <Bi en={g.description_en} fil={g.description_fil} />
                    </span>
                  ) : null}
                  {g.count ? (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
                      {g.count} items <ChevronRight aria-hidden className="size-3.5" />
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/library/dropoff"
        className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card hover:ring-1 hover:ring-line"
      >
        <MapPin aria-hidden className="size-5 shrink-0 text-brand-strong" />
        <span className="flex-1">
          <span className="block font-semibold text-ink">Drop-off finder</span>
          <span className="block text-sm text-ink-3">
            E-waste, batteries, hazardous waste, junk shops and take-back programmes.
          </span>
        </span>
        <ChevronRight aria-hidden className="size-4 text-ink-3" />
      </Link>

      <Note>
        Entries follow national law (RA 9003) and Quezon City rules, with sources on every page.
        Most were drafted with AI and are still being reviewed by the team; those say &quot;Not
        reviewed yet&quot;. Rules can differ by city or barangay.
      </Note>
    </div>
  );
}
