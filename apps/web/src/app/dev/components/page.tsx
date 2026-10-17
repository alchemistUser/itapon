// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { BinRow, BinTile, CategoryChip, Instruction, ItemIcon } from "@/components/bins/bins";
import { Button, ButtonLink } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/misc";
import {
  Card,
  ConfidenceBadge,
  EmptyState,
  Eyebrow,
  InfoCallout,
  Note,
  Skeleton,
  StepList,
} from "@/components/ui/primitives";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { WarmingUpOverlay } from "@/components/ui/warming-up-overlay";
import { BIN_ORDER } from "@/lib/bins";
import { MOCK_ITEMS } from "@/lib/mock";

export const metadata: Metadata = { title: "Components" };

const SCREENS = [
  ["/", "Home"],
  ["/scan", "S1 Scanning"],
  ["/scan/result/paper_bag", "S2 Result (recyclable)"],
  ["/scan/result/battery", "S2 Result (hazardous)"],
  ["/guide", "S3 Bin Guide"],
  ["/history", "S4 History"],
  ["/scan/plan", "S5/S7 What to do next"],
  ["/scan/plan/paper_bag", "S6 Before you sort"],
  ["/kiosk", "S8 Kiosk"],
  ["/dev/detector", "Detector test (Phase 9)"],
] as const;

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-ink-3 uppercase">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

// Design-system gallery for checking components against Figma (Phase 11).
export default function ComponentsPage() {
  const bag = MOCK_ITEMS.paper_bag;
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-bold text-ink">iTapon components</h1>

      <Block title="Screens">
        <ul className="flex flex-wrap gap-2">
          {SCREENS.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="text-sm text-brand-strong underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Buttons">
        <Button>Scan more items</Button>
        <Button variant="dark">Next Scan</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <ButtonLink href="/scan" size="lg">
          Large link
        </ButtonLink>
        <Button disabled>Disabled</Button>
        <ReadAloudButton text="Paper bag. Put it in the blue bin." variant="outline" />
      </Block>

      <Block title="Bin tiles · faded · item icons · chips">
        {BIN_ORDER.map((k) => (
          <div key={k} className="flex flex-col items-center gap-2">
            <BinTile category={k} size="lg" />
            <BinTile category={k} size="md" faded />
            <ItemIcon category={k} />
            <CategoryChip category={k} />
          </div>
        ))}
      </Block>

      <Block title="Bin row">
        <BinRow active="recyclable" className="max-w-md" />
        <BinRow active="hazardous" className="max-w-md" />
      </Block>

      <Block title="Badges, text">
        <ConfidenceBadge value={0.95} />
        <Eyebrow>Detected item</Eyebrow>
        <Instruction text={bag.instruction} category="recyclable" className="max-w-xs text-ink" />
        <Note>Bin colors follow your app&apos;s local guide.</Note>
      </Block>

      <Block title="Card, steps, callout">
        <Card className="flex max-w-md flex-col gap-4">
          <StepList steps={bag.steps} />
          <InfoCallout title="Why this recommendation?">{bag.why}</InfoCallout>
        </Card>
      </Block>

      <Block title="Inputs, loading, empty">
        <SearchInput placeholder="Search an item e.g. straw" className="w-72" />
        <Skeleton className="h-16 w-48" />
        <div className="w-72">
          <EmptyState icon={<span className="text-3xl">🗑️</span>} title="No scans yet">
            Scan an item to see it here.
          </EmptyState>
        </div>
      </Block>

      <Block title="Warming-up overlay (D3)">
        <WarmingUpOverlay className="h-64 w-72 rounded-card" loadedMB={7.4} totalMB={13} />
        <WarmingUpOverlay className="h-64 w-72 rounded-card" slow />
      </Block>
    </main>
  );
}
