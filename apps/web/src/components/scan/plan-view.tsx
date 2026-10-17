// SPDX-License-Identifier: AGPL-3.0-or-later
// "What to do next" (Figma iPhone 17 ×3 + iPad recommendations). Static mock data.
import { ArrowRight, CheckCheck, ChevronLeft, ChevronRight, Repeat2, Scan } from "lucide-react";
import Link from "next/link";

import { BinTile, CategoryChip, Instruction, ItemIcon } from "@/components/bins/bins";
import { speechFor } from "@/components/scan/scan-views";
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
import { MOCK_ITEMS, MOCK_PLAN, type MockItem } from "@/lib/mock";

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
      <BinTile category={item.category} size="md" className="size-12" />
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
          <p className="mt-1 text-xs text-ink-3">Why: {item.why}</p>
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
      <InfoCallout title="Why this recommendation?">{item.why}</InfoCallout>
      <ReadAloudButton text={speechFor(item)} />
    </Card>
  );
}

export function PlanView({ selected, mobile }: { selected: string; mobile: "summary" | "detail" }) {
  const items = MOCK_PLAN.map((k) => MOCK_ITEMS[k]);
  const primary = items[0];
  const current = MOCK_ITEMS[selected] ?? primary;
  const others = items.slice(1);

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
                <p className="font-semibold">{items.length} items. A better next step.</p>
                <p className="text-xs text-white">Reuse what you can. Separate the rest.</p>
              </div>
            </div>
            <SectionHeading title="Your action plan" aside="Today, 9:41 AM" />
            <Card className="flex flex-col gap-3">
              <DetectedHeader item={primary} />
              <Headline item={primary} />
              <hr className="border-line" />
              <div className="flex items-center justify-between">
                <ReadAloudButton text={speechFor(primary)} />
                <Link
                  href={`/scan/plan/${primary.classKey}`}
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-strong"
                >
                  Before you sort <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </Card>
            <SectionHeading title="Other scanned items" />
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
              <InfoCallout title="Why this recommendation?">{current.why}</InfoCallout>
              <ReadAloudButton text={speechFor(current)} />
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
            <span className="text-xs text-ink-3">Today, 9:41 AM</span>
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
