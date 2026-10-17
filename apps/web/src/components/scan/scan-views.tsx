// SPDX-License-Identifier: AGPL-3.0-or-later
// Static scanner / result views (Phase 11). Phase 12 replaces the camera mock with the
// live camera + in-browser detector; Phase 13 feeds real detections into the panels.
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { BinRow, BinTile, Instruction } from "@/components/bins/bins";
import { ButtonLink } from "@/components/ui/button";
import { ConfidenceBadge } from "@/components/ui/primitives";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import type { MockItem } from "@/lib/mock";

export function speechFor(item: MockItem) {
  const bin = BINS[item.category];
  return `${item.name}. Put it in the ${bin.colorWord} bin, ${bin.name}. ${item.instruction}`;
}

/** Corner-bracket guide frame over a dark camera placeholder. */
export function CameraMock({
  className,
  title = "Scanning",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <section
      aria-label="Camera preview"
      className={cn(
        "relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,#3a4253_0%,#161a22_55%,#0b0d12_100%)] text-white",
        className,
      )}
    >
      <div className="pt-safe absolute inset-x-0 top-0 z-10 flex items-center justify-center px-4 pt-4">
        <Link
          href="/"
          aria-label="Back"
          className="absolute left-4 flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      {/* guide frame */}
      <div aria-hidden className="absolute inset-[18%_12%_26%] md:inset-[22%_14%]">
        {[
          "top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl",
          "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl",
          "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl",
          "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl",
        ].map((c) => (
          <span key={c} className={cn("absolute size-14 border-white", c)} />
        ))}
      </div>
      <p className="absolute inset-x-0 bottom-[20%] text-center text-sm font-medium text-white/90 md:bottom-[8%]">
        Hold the item steady in the frame
      </p>
      <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-white/40">
        Live camera arrives in Phase 12
      </p>
    </section>
  );
}

/** Right-hand panel of the tablet/desktop split view (Figma tablet + website frames). */
export function ResultPanel({ item, className }: { item: MockItem; className?: string }) {
  const bin = BINS[item.category];
  return (
    <section aria-labelledby="result-heading" className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-3">{item.name}</p>
          <h2
            id="result-heading"
            className={cn("text-4xl font-bold tracking-tight lg:text-5xl", bin.text)}
          >
            {bin.name}
          </h2>
        </div>
        <ConfidenceBadge value={item.confidence} className="mt-6 px-4 py-1.5 text-sm" />
      </div>
      <Instruction text={item.instruction} category={item.category} className="text-xl text-ink" />
      <BinRow active={item.category} className="mt-auto pt-4" />
      <div className="flex items-center justify-between gap-3">
        <ReadAloudButton text={speechFor(item)} variant="outline" />
        <ButtonLink href="/scan" variant="dark">
          Next Scan
        </ButtonLink>
      </div>
    </section>
  );
}

/** Phone bottom sheet under the camera (Figma "Home Screen"). */
export function ResultSheet({ item }: { item: MockItem }) {
  const bin = BINS[item.category];
  return (
    <section
      aria-labelledby="sheet-heading"
      className="pb-safe relative z-10 -mt-6 rounded-t-3xl bg-white px-5 pt-3 shadow-[0_-8px_24px_rgb(0_0_0/0.12)]"
    >
      <div aria-hidden className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
      <p className="text-xs font-medium text-ink-3">{item.name}</p>
      <div className="flex items-center justify-between gap-3">
        <h2 id="sheet-heading" className={cn("text-xl font-bold", bin.text)}>
          {bin.name}
        </h2>
        <ConfidenceBadge value={item.confidence} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <BinTile category={item.category} size="lg" />
        <Instruction
          text={item.instruction}
          category={item.category}
          className="text-sm text-ink"
        />
      </div>
      <ButtonLink href={`/scan/result/${item.classKey}`} className="mt-4 mb-3 w-full">
        See where it goes
      </ButtonLink>
    </section>
  );
}
