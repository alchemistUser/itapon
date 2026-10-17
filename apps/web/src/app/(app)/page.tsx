// SPDX-License-Identifier: AGPL-3.0-or-later
import { BookOpen, Camera, ListChecks } from "lucide-react";

import { BinTile } from "@/components/bins/bins";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";
import { BIN_ORDER, BINS } from "@/lib/bins";

const STEPS = [
  { icon: Camera, title: "Point your camera", text: "Hold your trash steady in the frame." },
  {
    icon: ListChecks,
    title: "Get the right bin",
    text: "iTapon shows the bin and how to prepare it.",
  },
  { icon: BookOpen, title: "Learn as you go", text: "Check the Bin Guide for anything else." },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <Logo className="md:hidden" />

      <section className="flex flex-col gap-5 md:max-w-2xl md:py-6">
        <h1 className="text-4xl leading-tight font-bold tracking-tight text-ink md:text-5xl">
          Scan it. <span className="text-bin-blue">Sort it right.</span>
        </h1>
        <p className="text-base text-ink-2 md:text-lg">
          Point your phone at any piece of waste and iTapon tells you which bin it goes in:
          biodegradable, recyclable, residual or hazardous.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/scan" size="lg">
            <Camera aria-hidden className="size-5" />
            Start scanning
          </ButtonLink>
          <ButtonLink href="/guide" size="lg" variant="outline">
            Open Bin Guide
          </ButtonLink>
        </div>
        <ul className="flex gap-3" aria-label="The four bins">
          {BIN_ORDER.map((k) => (
            <li key={k} className="flex flex-col items-center gap-1">
              <BinTile category={k} size="md" />
              <span className="text-xs text-ink-3">{BINS[k].binLabel}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="how-it-works" aria-labelledby="how" className="scroll-mt-24">
        <h2 id="how" className="text-xl font-semibold text-ink">
          How it works
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3 md:gap-5">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-card bg-card p-5 shadow-card">
              <Icon aria-hidden className="size-6 text-brand-strong" />
              <p className="mt-3 font-semibold text-ink">
                {i + 1}. {title}
              </p>
              <p className="mt-1 text-sm text-ink-3">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
