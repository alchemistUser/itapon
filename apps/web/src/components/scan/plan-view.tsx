// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// "What to do next" (Figma iPhone 17 ×3 + iPad recommendations), built from the last
// locked scan (Phase 14): aggregated items, rule-based order, on-device thumbnails.
import { ArrowRight, CheckCheck, ChevronLeft, ChevronRight, Repeat2, Scan } from "lucide-react";
import Link from "next/link";

import { BinTile, CategoryChip, Instruction, ItemIcon } from "@/components/bins/bins";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  ConfidenceBadge,
  Eyebrow,
  InfoCallout,
  Note,
  PageTitle,
  SectionHeading,
  StepList,
} from "@/components/ui/primitives";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { cn } from "@/lib/cn";
import { getItemLive, useContentSource } from "@/lib/content-store";
import { useLastScan } from "@/lib/scan/last-scan";
import { orderPlan, type PlanEntry } from "@/lib/scan/plan";

interface MockItem {
  classKey: string;
  name: string;
  nameFil?: string;
  category: PlanEntry["category"];
  confidence: number;
  instruction: string;
  reuseTip?: string;
  steps: { title: string; detail: string }[];
  why: string;
  thumb?: string;
}

function toPlanItem(e: PlanEntry, thumbs: Record<string, string>): MockItem | null {
  const c = getItemLive(e.classKey);
  if (!c) return null;
  return {
    classKey: e.classKey,
    name: c.name,
    nameFil: c.nameFil,
    category: c.category,
    confidence: e.confidence,
    instruction: c.instruction,
    // The headline already says "Reuse it first."; don't repeat it when the tip starts with it.
    reuseTip: c.reuseTip?.replace(/^reuse it first\.\s*/i, "") || undefined,
    steps: c.steps.length ? c.steps : [{ title: "Sort it", detail: c.instruction }],
    why: c.why ?? c.contaminationNote ?? "",
    thumb: thumbs[e.classKey],
  };
}

function timeLabel(at: number) {
  const d = new Date(at);
  const today = new Date().toDateString() === d.toDateString();
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return today ? `Today, ${t}` : `${d.toLocaleDateString()}, ${t}`;
}

const LOCAL_RULES_NOTE =
  "Bin colors follow your app's local guide. Check local collection rules if you are unsure.";

function BackToResult() {
  return (
    <Link
      href="/scan"
      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-strong"
    >
      <ChevronLeft aria-hidden className="size-4" />
      Scan result
    </Link>
  );
}

function Headline({ item }: { item: MockItem }) {
  return item.reuseTip ? (
    <>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-strong uppercase">
        <Repeat2 aria-hidden className="size-4" />
        Best next step
      </p>
      <p className="text-3xl font-bold tracking-tight text-bin-blue">Reuse it first.</p>
      <p className="text-sm text-ink-2 md:text-base">{item.reuseTip}</p>
    </>
  ) : (
    <>
      <p className="text-xs font-semibold text-brand-strong uppercase">Best next step</p>
      <Instruction text={item.instruction} category={item.category} className="text-lg text-ink" />
    </>
  );
}

function DetectedHeader({ item }: { item: MockItem }) {
  return (
    <div className="flex items-start gap-3">
      {item.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- on-device data URL thumbnail
        <img
          src={item.thumb}
          alt={`Your ${item.name.toLowerCase()}`}
          className="size-12 shrink-0 rounded-[10px] object-cover"
        />
      ) : (
        <BinTile category={item.category} size="md" className="size-12" />
      )}
      <div className="min-w-0 flex-1">
        <Eyebrow>Detected item</Eyebrow>
        <p className="text-xl font-bold text-ink">{item.name}</p>
      </div>
      <ConfidenceBadge value={item.confidence} />
    </div>
  );
}

/** Compact card for the other scanned items (Banana peel, Snack wrapper, Used battery). */
function OtherItemCard({
  item,
  href,
  selected,
}: {
  item: MockItem;
  href?: string;
  selected?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        <ItemIcon category={item.category} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{item.name}</p>
          <CategoryChip category={item.category} />
        </div>
        {href ? <ChevronRight aria-hidden className="size-4 text-ink-3" /> : null}
      </div>
      {selected ? (
        // Details are already in the right-hand pane (iPad frame shows a compact card).
        <p className="mt-2 text-xs font-medium text-brand-strong">Viewing recommendation</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-2">{item.instruction}</p>
          {item.why ? <p className="mt-1 text-xs text-ink-3">Why: {item.why}</p> : null}
        </>
      )}
    </>
  );
  const cls = cn(
    "block rounded-card bg-card p-4 shadow-card",
    selected && "bg-brand-tint ring-2 ring-brand",
  );
  return href ? (
    <Link
      href={href}
      className={cn(cls, "hover:ring-1 hover:ring-line")}
      aria-current={selected || undefined}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function DetailPane({ item }: { item: MockItem }) {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <DetectedHeader item={item} />
      <div className="flex flex-col gap-2">
        <Headline item={item} />
      </div>
      <hr className="border-line" />
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-ink">Before you sort</h3>
        <StepList steps={item.steps} />
      </div>
      {item.why ? <InfoCallout title="Why this recommendation?">{item.why}</InfoCallout> : null}
      <ReadAloudButton item={item} />
    </Card>
  );
}

export function PlanView({
  selected,
  mobile,
}: {
  selected?: string;
  mobile: "summary" | "detail";
}) {
  const scan = useLastScan();
  useContentSource(); // re-render when fresher copy arrives

  if (!scan) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-card px-6 py-12 text-center shadow-card">
        <Scan aria-hidden className="size-8 text-ink-3" />
        <p className="text-lg font-semibold text-ink">No scan yet</p>
        <p className="max-w-sm text-sm text-ink-3">
          Scan your items and iTapon will suggest what to do with each one.
        </p>
        <ButtonLink href="/scan">Start scanning</ButtonLink>
      </div>
    );
  }

  const ordered = orderPlan(scan.entries, (k) => Boolean(getItemLive(k)?.reuseTip), scan.lockedKey);
  const toItem = (e: PlanEntry) => toPlanItem(e, scan.thumbs);
  const primary = ordered.primary ? toItem(ordered.primary) : null;
  const others = ordered.others.map(toItem).filter((i): i is MockItem => i !== null);
  if (!primary) return null;
  const items = [primary, ...others];
  const current = items.find((i) => i.classKey === selected) ?? primary;
  const when = timeLabel(scan.at);

  return (
    <>
      {/* ---------- phone ---------- */}
      <div className="flex flex-col gap-5 md:hidden">
        <BackToResult />
        {mobile === "summary" ? (
          <>
            <PageTitle title="What to do next" subtitle="Smart recommendations for your scan." />
            <div className="flex items-center gap-3 rounded-card bg-brand-button p-4 text-white">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-tile bg-white/20">
                <CheckCheck aria-hidden className="size-5" />
              </span>
              <div>
                <p className="font-semibold">
                  {items.length} {items.length === 1 ? "item" : "items"}. A better next step.
                </p>
                <p className="text-xs text-white">Reuse what you can. Separate the rest.</p>
              </div>
            </div>
            <SectionHeading title="Your action plan" aside={when} />
            <Card className="flex flex-col gap-3">
              <DetectedHeader item={primary} />
              <Headline item={primary} />
              <hr className="border-line" />
              <div className="flex items-center justify-between">
                <ReadAloudButton item={primary} />
                <Link
                  href={`/scan/plan/${primary.classKey}`}
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-strong"
                >
                  Before you sort <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </Card>
            {others.length ? <SectionHeading title="Other scanned items" /> : null}
            {others.map((it) => (
              <OtherItemCard key={it.classKey} item={it} href={`/scan/plan/${it.classKey}`} />
            ))}
            <Note>{LOCAL_RULES_NOTE}</Note>
            <ButtonLink href="/scan" size="lg" className="w-full">
              <Scan aria-hidden className="size-5" /> Scan more items
            </ButtonLink>
          </>
        ) : (
          <>
            <PageTitle
              title="Before you sort"
              subtitle={`Prepare your ${current.name.toLowerCase()} for its next step.`}
            />
            <Card className="flex flex-col gap-4">
              <DetectedHeader item={current} />
              <h2 className="text-base font-semibold text-ink">Before you sort</h2>
              <StepList steps={current.steps} />
              {current.why ? (
                <InfoCallout title="Why this recommendation?">{current.why}</InfoCallout>
              ) : null}
              <ReadAloudButton item={current} />
            </Card>
            <Link
              href="/scan/plan"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-strong"
            >
              <ChevronLeft aria-hidden className="size-4" /> All scanned items
            </Link>
          </>
        )}
      </div>

      {/* ---------- tablet / desktop: master–detail ---------- */}
      <div className="hidden flex-col gap-6 md:flex">
        <BackToResult />
        <div className="flex items-start justify-between gap-6">
          <PageTitle
            title="What to do next"
            subtitle={`${items.length} items detected. Reuse what you can. Separate the rest.`}
          />
          <div className="flex flex-col items-end gap-1">
            <ButtonLink href="/scan">
              <Scan aria-hidden className="size-4" /> Scan more items
            </ButtonLink>
            <span className="text-xs text-ink-3">{when}</span>
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,9fr)] gap-6">
          <section aria-label="Your scanned items" className="flex flex-col gap-3">
            <SectionHeading title="Your scanned items" aside={`${items.length} items`} />
            <ul className="flex flex-col gap-3">
              {items.map((it) => (
                <li key={it.classKey}>
                  <OtherItemCard
                    item={it}
                    href={
                      it.classKey === primary.classKey ? "/scan/plan" : `/scan/plan/${it.classKey}`
                    }
                    selected={it.classKey === current.classKey}
                  />
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="next-step" className="flex flex-col gap-3">
            <h2 id="next-step" className="text-base font-semibold text-ink">
              Your recommended next step
            </h2>
            <DetailPane item={current} />
          </section>
        </div>
        <div className="flex items-center justify-between gap-4">
          <Note>{LOCAL_RULES_NOTE}</Note>
          <Link
            href="/guide"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-strong"
          >
            View local bin guide <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
