// SPDX-License-Identifier: AGPL-3.0-or-later
import { ArrowDown, ChevronLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BinTile, Instruction } from "@/components/bins/bins";
import { CameraMock, ResultPanel, speechFor } from "@/components/scan/scan-views";
import { ButtonLink } from "@/components/ui/button";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import { MOCK_ITEMS } from "@/lib/mock";

export function generateStaticParams() {
  return Object.keys(MOCK_ITEMS).map((item) => ({ item }));
}

export async function generateMetadata(props: PageProps<"/scan/result/[item]">): Promise<Metadata> {
  const { item } = await props.params;
  return { title: MOCK_ITEMS[item] ? `${MOCK_ITEMS[item].name} result` : "Result" };
}

// S2 Result: full-colour "Blue Bin" screen on phones, split view on md+.
export default async function ResultPage(props: PageProps<"/scan/result/[item]">) {
  const { item: key } = await props.params;
  const item = MOCK_ITEMS[key];
  if (!item) notFound();
  const bin = BINS[item.category];

  return (
    <>
      <div className={cn("flex min-h-dvh flex-col text-white md:hidden", bin.solid)}>
        <div className="pt-safe relative flex items-center justify-center px-4 pt-4">
          <Link
            href="/scan"
            aria-label="Back to scanner"
            className="absolute left-4 flex size-10 items-center justify-center rounded-full bg-white/25 hover:bg-white/35"
          >
            <ChevronLeft aria-hidden className="size-6" />
          </Link>
          <p className="text-xl font-bold">Result</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6">
          <h1 className="text-5xl font-bold tracking-tight">{bin.binLabel}</h1>
          <ArrowDown aria-hidden className="size-12" strokeWidth={3} />
          <Trash2 aria-hidden className="size-36" strokeWidth={1.75} />
        </div>
        <section
          aria-label={`${item.name} instructions`}
          className="pb-safe mx-3 mb-3 rounded-3xl bg-white p-5 text-ink"
        >
          <div aria-hidden className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
          <h2 className="text-lg font-bold">{item.name}</h2>
          <div className="mt-3 flex items-center gap-3">
            <BinTile category={item.category} size="lg" />
            <Instruction text={item.instruction} category={item.category} className="text-sm" />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <ReadAloudButton text={speechFor(item)} variant="outline" />
            <ButtonLink href="/scan" variant="dark" className="px-6">
              Next Scan
            </ButtonLink>
          </div>
        </section>
      </div>

      <div className="hidden gap-8 md:grid md:grid-rows-[minmax(380px,46vh)_auto] lg:min-h-[600px] lg:grid-cols-2 lg:grid-rows-1">
        <CameraMock className="rounded-[28px]" />
        <ResultPanel item={item} className="py-4" />
      </div>
    </>
  );
}
