// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { SearchInput } from "@/components/ui/misc";
import { logSearchMiss, useLibraryIndex } from "@/lib/library/client";
import { createLibrarySearch } from "@/lib/library/search";

import { ItemList } from "./item-list";
import { LangProvider } from "./lang";

/**
 * Search the whole library (Phase 30): names, Filipino, aliases, materials and resin codes,
 * with "did you mean". Loads the index on first render (cached offline by the service
 * worker). `fallback` renders instead while the library has no entries yet.
 */
export function LibrarySearch({
  className,
  fallback,
}: {
  className?: string;
  fallback?: React.ReactNode;
}) {
  const index = useLibraryIndex();
  const search = useMemo(
    () => (index ? createLibrarySearch(index.items, index.materials) : null),
    [index],
  );
  const [query, setQuery] = useState("");
  const result = useMemo(() => (search ? search(query) : { items: [] }), [search, query]);
  // A search that still finds nothing after a pause goes to the content backlog (Phase 34).
  const missing = !!search && query.trim().length >= 3 && !result.items.length;
  useEffect(() => {
    if (!missing) return;
    const t = setTimeout(() => logSearchMiss(query), 1500);
    return () => clearTimeout(t);
  }, [missing, query]);
  const listId = useId();

  if (index && !index.items.length && fallback) return <>{fallback}</>;
  const active = query.trim().length >= 1 && (result.items.length || query.trim().length >= 2);

  return (
    <div className={className}>
      <SearchInput
        label="Search the library"
        placeholder="Search e.g. shampoo bottle, baterya, #5"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-controls={listId}
        autoComplete="off"
        enterKeyHint="search"
      />
      <div id={listId} aria-live="polite" className="relative">
        {active ? (
          result.items.length ? (
            <LangProvider>
              <ItemList items={result.items} className="mt-2 md:absolute md:inset-x-0 md:z-20" />
            </LangProvider>
          ) : (
            <div className="mt-2 flex items-start gap-2 rounded-card bg-card p-4 text-sm text-ink-3 shadow-card md:absolute md:inset-x-0 md:z-20">
              <Search aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p>
                {index === undefined ? (
                  "Loading the library…"
                ) : (
                  <>
                    No match for “{query.trim()}”.{" "}
                    {result.didYouMean ? (
                      <>
                        Did you mean{" "}
                        <button
                          type="button"
                          className="font-semibold text-brand-strong underline"
                          onClick={() => setQuery(result.didYouMean!.name_en)}
                        >
                          {result.didYouMean.name_en}
                        </button>
                        ?
                      </>
                    ) : (
                      "Try another word, or scan it."
                    )}
                  </>
                )}
              </p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
