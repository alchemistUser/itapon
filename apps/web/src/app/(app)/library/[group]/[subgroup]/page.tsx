// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BinTile } from "@/components/bins/bins";
import { ItemList } from "@/components/library/item-list";
import { Bi } from "@/components/library/lang";
import { EmptyState } from "@/components/ui/primitives";
import { BINS } from "@/lib/bins";
import { itemsIn, materialPath } from "@/lib/library/core";
import { groupFromPath, LIBRARY, subgroupFromPath } from "@/lib/library/server";

export function generateStaticParams() {
  return LIBRARY.materials
    .filter((m) => m.parent)
    .map((m) => ({ group: m.parent!.toLowerCase(), subgroup: m.code.toLowerCase() }));
}

export async function generateMetadata(
  props: PageProps<"/library/[group]/[subgroup]">,
): Promise<Metadata> {
  const { group, subgroup } = await props.params;
  const sub = subgroupFromPath(group, subgroup);
  return sub ? { title: `${sub.name_en} disposal` } : { title: "Disposal library" };
}

// Subgroup (Phase 30), e.g. "#5 PP" or "Fluorescent tubes and CFLs".
export default async function LibrarySubgroupPage(props: PageProps<"/library/[group]/[subgroup]">) {
  const params = await props.params;
  const group = groupFromPath(params.group);
  const sub = subgroupFromPath(params.group, params.subgroup);
  if (!group || !sub) notFound();
  const items = itemsIn(LIBRARY.items, sub.code);

  return (
    <div className="flex flex-col gap-6 md:max-w-3xl">
      <Link
        href={materialPath(group.code)}
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-brand-strong"
      >
        <ChevronLeft aria-hidden className="size-4" />
        <Bi en={group.name_en} fil={group.name_fil} />
      </Link>
      <header className="flex items-center gap-4">
        {sub.default_bin ? <BinTile category={sub.default_bin} size="md" /> : null}
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink md:text-4xl">
            <Bi en={sub.name_en} fil={sub.name_fil} />
          </h1>
          {sub.description_en ? (
            <p className="mt-1 text-sm text-ink-3 md:text-base">
              <Bi en={sub.description_en} fil={sub.description_fil} />
            </p>
          ) : sub.default_bin ? (
            <p className={`mt-1 text-sm font-semibold ${BINS[sub.default_bin].text}`}>
              Usually the {BINS[sub.default_bin].binLabel.toLowerCase()}
            </p>
          ) : null}
        </div>
      </header>
      {items.length ? (
        <ItemList items={items} />
      ) : (
        <EmptyState icon={null} title="No entries yet">
          The team is still reviewing this type.
        </EmptyState>
      )}
    </div>
  );
}
