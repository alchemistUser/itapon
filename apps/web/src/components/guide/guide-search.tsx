// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { BinTile } from "@/components/bins/bins";
import { SearchInput } from "@/components/ui/misc";
import { BINS } from "@/lib/bins";
import { useItems } from "@/lib/content-store";
import { createItemSearch } from "@/lib/search";

/** Search box + results (Phase 15). Results link to the item on its bin's guide page. */
export function GuideSearch({ className }: { className?: string }) {
  const items = useItems();
  const search = useMemo(() => createItemSearch(items), [items]);
  const [query, setQuery] = useState("");
  const results = useMemo(() => search(query), [search, query]);
  const listId = useId();
  const active = query.trim().length >= 2;

  return (
    <div className={className}>
      <SearchInput
        placeholder="Search an item e.g. straw"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-controls={listId}
        autoComplete="off"
        enterKeyHint="search"
      />
      <div id={listId} aria-live="polite" className="relative">
        {active ? (
          results.length ? (
            <ul className="mt-2 flex flex-col overflow-hidden rounded-card bg-card shadow-card md:absolute md:inset-x-0 md:z-20">
              {results.map((item) => {
                const bin = BINS[item.category];
                return (
                  <li key={item.classKey} className="border-b border-line last:border-0">
                    <Link
                      href={`/guide/${item.category}#${item.classKey}`}
                      className="flex items-center gap-3 p-3 hover:bg-surface"
                    >
                      <BinTile category={item.category} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{item.name}</span>
                        <span className={`block text-xs font-semibold ${bin.text}`}>
                          {bin.name} · {bin.binLabel}
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-3">{item.instruction}</span>
                      </span>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 flex items-center gap-2 rounded-card bg-card p-4 text-sm text-ink-3 shadow-card md:absolute md:inset-x-0 md:z-20">
              <Search aria-hidden className="size-4 shrink-0" />
              No match for “{query.trim()}”. Try another word, or scan it.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}
