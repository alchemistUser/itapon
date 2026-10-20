// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ItemList } from "@/components/library/item-list";
import { Bi } from "@/components/library/lang";
import { EmptyState } from "@/components/ui/primitives";
import { groupsOf, itemsIn, materialPath, subgroupsOf } from "@/lib/library/core";
import { groupFromPath, LIBRARY } from "@/lib/library/server";

export function generateStaticParams() {
  return groupsOf(LIBRARY.materials).map((g) => ({ group: g.code.toLowerCase() }));
}

export async function generateMetadata(props: PageProps<"/library/[group]">): Promise<Metadata> {
  const group = groupFromPath((await props.params).group);
  return group
    ? { title: `${group.name_en} disposal`, description: group.description_en ?? undefined }
    : { title: "Disposal library" };
}

// Material group (Phase 30): what it is, its subgroups and every item in it.
export default async function LibraryGroupPage(props: PageProps<"/library/[group]">) {
  const group = groupFromPath((await props.params).group);
  if (!group) notFound();
  const subs = subgroupsOf(LIBRARY.materials, group.code)
    .map((s) => ({ ...s, count: itemsIn(LIBRARY.items, s.code).length }))
    .filter((s) => s.count);
  const items = itemsIn(LIBRARY.items, group.code);

  return (
    <div className="flex flex-col gap-6 md:max-w-3xl">
      <Link
        href="/library"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-brand-strong"
      >
        <ChevronLeft aria-hidden className="size-4" /> Library
      </Link>
      <header>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink md:text-4xl">
          <Bi en={group.name_en} fil={group.name_fil} />
        </h1>
        {group.description_en ? (
          <p className="mt-1 text-sm text-ink-3 md:text-base">
            <Bi en={group.description_en} fil={group.description_fil} />
          </p>
        ) : null}
      </header>

      {subs.length > 1 ? (
        <nav aria-label="Types">
          <ul className="flex flex-wrap gap-2">
            {subs.map((s) => (
              <li key={s.code}>
                <Link
                  href={materialPath(s.code)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm text-ink hover:bg-surface"
                >
                  <Bi en={s.name_en} fil={s.name_fil} />
                  <span className="text-xs text-ink-3">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {group.code === "PLA" ? (
        <p className="rounded-tile bg-brand-tint p-3 text-sm text-ink">
          Look for the number in the triangle (resin code) on the bottom of the item. It tells you
          the type of plastic. #1 PET and #2 HDPE are the easiest to recycle.
        </p>
      ) : null}

      {items.length ? (
        <ItemList items={items} />
      ) : (
        <EmptyState icon={null} title="No entries yet">
          The team is still reviewing this group.
        </EmptyState>
      )}
    </div>
  );
}
