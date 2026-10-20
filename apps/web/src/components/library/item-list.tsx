// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { BinTile } from "@/components/bins/bins";
import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import { itemPath } from "@/lib/library/core";
import type { LibraryIndexItem } from "@/lib/library/types";

import { Bi } from "./lang";

/** A list of entries: bin tile, name (EN/FIL), bin and one-line summary. */
export function ItemList({ items, className }: { items: LibraryIndexItem[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col overflow-hidden rounded-card bg-card shadow-card", className)}>
      {items.map((item) => {
        const bin = BINS[item.bin];
        return (
          <li key={item.slug} className="border-b border-line last:border-0">
            <Link
              href={itemPath(item.slug)}
              className="flex items-center gap-3 p-3 hover:bg-surface"
            >
              <BinTile category={item.bin} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  <Bi en={item.name_en} fil={item.name_fil} />
                  {item.draft ? (
                    <span className="ml-2 align-middle text-[11px] font-medium text-ink-3">
                      draft
                    </span>
                  ) : null}
                </span>
                <span className={cn("block text-xs font-semibold", bin.text)}>
                  {bin.name} · {bin.binLabel}
                </span>
                <span className="mt-0.5 block text-sm text-ink-3">
                  <Bi en={item.summary_en} fil={item.summary_fil} />
                </span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
