// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ItemEntry } from "@/components/library/item-entry";
import { BINS } from "@/lib/bins";
import { getLibraryItem, LIBRARY } from "@/lib/library/server";

// Until the team publishes the first entries there are no items; Cache Components needs at
// least one param, so a placeholder renders the 404.
const NONE = "_none";

export function generateStaticParams() {
  const slugs = LIBRARY.items.map((i) => ({ slug: i.slug }));
  return slugs.length ? slugs : [{ slug: NONE }];
}

export async function generateMetadata(
  props: PageProps<"/library/item/[slug]">,
): Promise<Metadata> {
  const item = getLibraryItem((await props.params).slug);
  if (!item) return { title: "Disposal library" };
  return {
    title: `${item.name_en}: how to dispose`,
    description: `${BINS[item.bin].binLabel}. ${item.summary_en}`,
    robots: item.draft ? { index: false } : undefined,
  };
}

// One library entry (Phase 30), prerendered for every item.
export default async function LibraryItemPage(props: PageProps<"/library/item/[slug]">) {
  const item = getLibraryItem((await props.params).slug);
  if (!item) notFound();
  return <ItemEntry item={item} ctx={LIBRARY} />;
}
