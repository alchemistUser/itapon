// SPDX-License-Identifier: AGPL-3.0-or-later
// Scanner / result building blocks shared by the live scanner (Phase 12), the result
// page and the kiosk mock. Phase 13 adds scan logging and Supabase content.
import { ChevronLeft, ListChecks } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BinRow, BinTile, Instruction } from "@/components/bins/bins";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfidenceBadge } from "@/components/ui/primitives";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import { CONFIDENT_THRESHOLD } from "@/lib/detector/models";
import type { Category } from "@/lib/detector/types";

/** What a result screen needs to know about an item. */
export interface ResultView {
  classKey: string;
  name: string;
  nameFil?: string;
  category: Category;
  instruction: string;
  confidence?: number;
  /** Other items seen in the same frame (low-confidence variant). */
  alternatives?: ResultView[];
  /** Distinct items in the scan; ≥ 2 offers the "What to do next" plan (Phase 14). */
  planCount?: number;
}

function PlanLink({ item, className }: { item: ResultView; className?: string }) {
  if (!item.planCount || item.planCount < 2) return null;
  return (
    <ButtonLink href="/scan/plan" variant="outline" className={className}>
      <ListChecks aria-hidden className="size-4" />
      What to do next · {item.planCount} items
    </ButtonLink>
  );
}

const isUnsure = (item: ResultView) =>
  item.confidence !== undefined && item.confidence < CONFIDENT_THRESHOLD;

/** "We think this is X (32%)" + alternatives + Bin Guide link (Phase 13 task 4). */
function UnsureNote({ item }: { item: ResultView }) {
  return (
    <div className="rounded-tile bg-surface p-3 text-sm">
      <p className="font-semibold text-ink">
        We think this is {item.name.toLowerCase()} ({Math.round((item.confidence ?? 0) * 100)}%)
      </p>
      {item.alternatives?.length ? (
        <p className="mt-1 text-ink-3">
          It could also be{" "}
          {item.alternatives.map((a, i) => (
            <span key={a.classKey}>
              {i > 0 ? " or " : ""}
              <span className="font-medium text-ink-2">{a.name.toLowerCase()}</span> (
              {BINS[a.category].binLabel.toLowerCase()})
            </span>
          ))}
          .
        </p>
      ) : null}
      <Link
        href={`/guide/${item.category}#${item.classKey}`}
        className="mt-1 inline-block font-medium text-brand-strong underline"
      >
        Check the Bin Guide
      </Link>
    </div>
  );
}

/** Top bar (back + title + optional actions), corner guide frame and hint, over the camera. */
export function CameraChrome({
  title = "Scanning",
  hint = "Hold the item steady in the frame",
  actions,
  showFrame = true,
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  showFrame?: boolean;
}) {
  return (
    <>
      <div className="pt-safe absolute inset-x-0 top-0 z-20 flex items-center justify-center px-4 pt-4 text-white">
        <Link
          href="/"
          aria-label="Back"
          className="absolute left-4 flex size-11 items-center justify-center rounded-full bg-black/30 backdrop-blur hover:bg-black/40"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold drop-shadow">{title}</h1>
        {actions ? <div className="absolute right-4 flex gap-2">{actions}</div> : null}
      </div>
      {showFrame ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[18%_12%_26%] z-10 md:inset-[20%_14%]"
        >
          {[
            "top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl",
            "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl",
          ].map((c) => (
            <span key={c} className={cn("absolute size-14 border-white/90", c)} />
          ))}
        </div>
      ) : null}
      <p
        aria-hidden
        className="absolute inset-x-0 bottom-[20%] z-10 px-6 text-center text-sm font-medium text-white drop-shadow md:bottom-[7%]"
      >
        {hint}
      </p>
    </>
  );
}

/** Dark placeholder with the camera chrome (kiosk mock until Phase 18). */
export function CameraMock({ className, title }: { className?: string; title?: string }) {
  return (
    <section
      aria-label="Camera preview"
      className={cn(
        "relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,#3a4253_0%,#161a22_55%,#0b0d12_100%)]",
        className,
      )}
    >
      <CameraChrome title={title} />
    </section>
  );
}

function NextScan({ onNext }: { onNext?: () => void }) {
  return onNext ? (
    <Button variant="dark" onClick={onNext}>
      Next Scan
    </Button>
  ) : (
    <ButtonLink href="/scan" variant="dark">
      Next Scan
    </ButtonLink>
  );
}

/** Right-hand panel of the tablet/desktop split view (Figma tablet + website frames). */
export function ResultPanel({
  item,
  onNext,
  binOrder,
  hidePlanLink = false,
  feedback,
  className,
}: {
  item: ResultView;
  onNext?: () => void;
  binOrder?: Category[];
  hidePlanLink?: boolean;
  /** "Was this right?" slot (Phase 20). */
  feedback?: ReactNode;
  className?: string;
}) {
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
        {item.confidence !== undefined ? (
          <ConfidenceBadge value={item.confidence} className="mt-6 px-4 py-1.5 text-sm" />
        ) : null}
      </div>
      <Instruction text={item.instruction} category={item.category} className="text-xl text-ink" />
      {isUnsure(item) ? <UnsureNote item={item} /> : null}
      {hidePlanLink ? null : <PlanLink item={item} className="self-start" />}
      {feedback}
      <BinRow active={item.category} order={binOrder} className="mt-auto pt-4" />
      <div className="flex items-center justify-between gap-3">
        <ReadAloudButton item={item} variant="outline" />
        <NextScan onNext={onNext} />
      </div>
    </section>
  );
}

/** Phone bottom sheet under the camera (Figma "Home Screen"), for a locked result. */
export function ResultSheet({
  item,
  onNext,
  feedback,
}: {
  item: ResultView;
  onNext?: () => void;
  feedback?: ReactNode;
}) {
  const bin = BINS[item.category];
  return (
    <SheetShell labelledBy="sheet-heading">
      <p className="text-xs font-medium text-ink-3">{item.name}</p>
      <div className="flex items-center justify-between gap-3">
        <h2 id="sheet-heading" className={cn("text-xl font-bold", bin.text)}>
          {bin.name}
        </h2>
        {item.confidence !== undefined ? <ConfidenceBadge value={item.confidence} /> : null}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <BinTile category={item.category} size="lg" />
        <Instruction
          text={item.instruction}
          category={item.category}
          className="text-sm text-ink"
        />
      </div>
      {isUnsure(item) ? (
        <div className="mt-3">
          <UnsureNote item={item} />
        </div>
      ) : null}
      <PlanLink item={item} className="mt-4 w-full" />
      {feedback ? <div className="mt-4">{feedback}</div> : null}
      <div className="mt-4 mb-3 grid grid-cols-[auto_1fr] gap-3">
        {onNext ? (
          <Button variant="outline" onClick={onNext}>
            Scan again
          </Button>
        ) : null}
        <ButtonLink href={`/scan/result/${item.classKey}`} className={onNext ? "" : "col-span-2"}>
          See where it goes
        </ButtonLink>
      </div>
    </SheetShell>
  );
}

export function SheetShell({
  children,
  labelledBy,
  label,
}: {
  children: ReactNode;
  labelledBy?: string;
  label?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={label}
      className="pb-safe relative z-30 -mt-6 rounded-t-3xl bg-white px-5 pt-3 shadow-[0_-8px_24px_rgb(0_0_0/0.12)]"
    >
      <div aria-hidden className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
      {children}
    </section>
  );
}
