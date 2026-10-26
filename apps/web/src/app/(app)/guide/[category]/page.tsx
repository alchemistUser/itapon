// SPDX-License-Identifier: AGPL-3.0-or-later
import { ChevronLeft, Info, Repeat2, Scan } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BinTile, Instruction } from "@/components/bins/bins";
import { HashHighlight } from "@/components/guide/hash-highlight";
import { ButtonLink } from "@/components/ui/button";
import { Note } from "@/components/ui/primitives";
import { BIN_ORDER, BINS } from "@/lib/bins";
import { GUIDE_ITEMS } from "@/lib/content";
import { itemPath } from "@/lib/library/core";
import { LIBRARY } from "@/lib/library/server";
import type { Category } from "@/lib/detector/types";

const isCategory = (v: string): v is Category => (BIN_ORDER as string[]).includes(v);

export function generateStaticParams() {
  return BIN_ORDER.map((category) => ({ category }));
}

export async function generateMetadata(props: PageProps<"/guide/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  if (!isCategory(category)) return { title: "Bin Guide" };
  const bin = BINS[category];
  return {
    title: `${bin.name} (${bin.binLabel})`,
    description: `What goes in the ${bin.binLabel.toLowerCase()}: ${bin.examples}. How to prepare each item.`,
  };
}

// Category detail (Phase 15): every item in this bin with its instruction, reuse tip and
// contamination note. Each item has an anchor (#class_key) that search results link to.
export default async function GuideCategoryPage(props: PageProps<"/guide/[category]">) {
  const { category } = await props.params;
  if (!isCategory(category)) notFound();
  const bin = BINS[category];
  const more = LIBRARY.items
    .filter((i) => i.bin === category)
    .sort((a, b) => a.name_en.localeCompare(b.name_en));
  const items = GUIDE_ITEMS.filter((i) => i.category === category).sort(
    (a, b) => Number(b.detectable) - Number(a.detectable) || a.name.localeCompare(b.name),
  );

  return (
    <div className="flex flex-col gap-6 md:max-w-3xl">
      <Link
        href="/guide"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-brand-strong"
      >
        <ChevronLeft aria-hidden className="size-4" /> Bin Guide
      </Link>

      <header className="flex items-center gap-4">
        <BinTile category={category} size="lg" />
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink md:text-4xl">
            {bin.name}
          </h1>
          <p className={`text-sm font-semibold ${bin.text}`}>{bin.binLabel}</p>
          <p className="mt-1 text-sm text-ink-3">{bin.examples}</p>
        </div>
      </header>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.classKey}
            id={item.classKey}
            className="scroll-mt-24 rounded-card bg-card p-4 shadow-card data-highlight:ring-2 data-highlight:ring-brand"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold text-ink">
                {item.name}
                {item.nameFil && item.nameFil !== item.name ? (
                  <span className="ml-2 text-sm font-normal text-ink-3" lang="fil">
                    {item.nameFil}
                  </span>
                ) : null}
              </h2>
              {item.detectable ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-strong">
                  <Scan aria-hidden className="size-3.5" /> iTapon can scan this
                </span>
              ) : null}
            </div>
            <Instruction
              text={item.instruction}
              category={item.category}
              className="mt-1 text-sm text-ink-2"
            />
            {item.reuseTip ? (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-3">
                <Repeat2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-strong" />
                {item.reuseTip}
              </p>
            ) : null}
            {item.contaminationNote ? (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-3">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {item.contaminationNote}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {more.length ? (
        <section aria-labelledby="more-heading" className="flex flex-col gap-3">
          <h2 id="more-heading" className="text-base font-semibold text-ink">
            More items for this bin ({more.length})
          </h2>
          <ul className="flex flex-wrap gap-2">
            {more.map((i) => (
              <li key={i.slug}>
                <Link
                  href={itemPath(i.slug)}
                  className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-3 text-sm text-ink hover:bg-surface"
                >
                  {i.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <HashHighlight />
      <Note>
        Bin colors follow your app&apos;s local guide. Check local collection rules if you are
        unsure.
      </Note>
      <ButtonLink href="/scan" className="self-start">
        <Scan aria-hidden className="size-4" /> Scan an item
      </ButtonLink>
    </div>
  );
}
