// SPDX-License-Identifier: AGPL-3.0-or-later
// A full library entry (Phase 30). Rendered on the server for the prerendered item pages and
// in the browser for the offline fallback, so it takes all its data as props.
import {
  ChevronLeft,
  CircleSlash,
  ExternalLink,
  Lightbulb,
  MapPin,
  Repeat2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BinTile } from "@/components/bins/bins";
import { StepList } from "@/components/ui/primitives";
import { BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import {
  confusedWith,
  groupOf,
  itemPath,
  LGU_NAMES,
  materialPath,
  rulesFor,
  VALUE_LINE,
  whereElse,
} from "@/lib/library/core";
import type { LibraryIndex, LibraryIndexItem, LibraryItem, PrepStep } from "@/lib/library/types";

import { IdeaActions, ViewLogger } from "./actions";
import { CampusNotes } from "./campus-notes";
import { Bi, InLang, LangToggle, ReadEntryButton } from "./lang";

export type LibraryContext = Pick<
  LibraryIndex,
  "materials" | "destinations" | "local_rules" | "sources"
> & { items: LibraryIndexItem[] };

function Section({
  title,
  icon,
  children,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function spoken(name: string, bin: string, summary: string, steps: PrepStep[]) {
  return [name, bin, summary, ...steps.map((s) => `${s.title}. ${s.detail}`)].join(". ");
}

export function ItemLinks({ items, label }: { items: LibraryIndexItem[]; label: ReactNode }) {
  if (!items.length) return null;
  return (
    <Section title={label}>
      <ul className="flex flex-wrap gap-2">
        {items.map((o) => (
          <li key={o.slug}>
            <Link
              href={itemPath(o.slug)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white py-1 pr-3 pl-1.5 text-sm text-ink hover:bg-surface"
            >
              <BinTile category={o.bin} size="sm" className="size-7 rounded-full" />
              <Bi en={o.name_en} fil={o.name_fil} />
              <span className={cn("text-xs font-semibold", BINS[o.bin].text)}>
                {BINS[o.bin].binLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function ItemEntry({
  item,
  ctx,
  source = "library",
}: {
  item: LibraryItem;
  ctx: LibraryContext;
  source?: "library" | "scan";
}) {
  const bin = BINS[item.bin];
  const mats = new Map(ctx.materials.map((m) => [m.code, m]));
  const sub = mats.get(item.material);
  const group = mats.get(groupOf(item.material));
  const others = whereElse(item, ctx.destinations);
  const othersFil = whereElse(item, ctx.destinations, "fil");
  const rules = rulesFor(ctx.local_rules, item);
  const bySlug = new Map(ctx.items.map((i) => [i.slug, i]));
  const confused = confusedWith(ctx.items, item);
  const confusedSet = new Set(confused.map((c) => c.slug));
  const related = item.related
    .map((s) => bySlug.get(s))
    .filter((i): i is LibraryIndexItem => !!i && !confusedSet.has(i.slug));
  const sources = item.sources.map((id) => ctx.sources.find((s) => s.id === id)).filter((s) => !!s);
  const ideas = [
    ...item.reuse_en.map((en, i) => ({ en, fil: item.reuse_fil[i], kind: "reuse" as const })),
    ...item.reduce_en.map((en, i) => ({ en, fil: item.reduce_fil[i], kind: "reduce" as const })),
  ];
  const hazardous = item.bin === "hazardous" || !!item.hazard_en;

  return (
    <article className="flex flex-col gap-6 md:max-w-3xl">
      <ViewLogger slug={item.slug} source={source} />
      {group ? (
        <Link
          href={sub ? materialPath(sub.code) : materialPath(group.code)}
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-brand-strong"
        >
          <ChevronLeft aria-hidden className="size-4" />
          <Bi en={sub?.name_en ?? group.name_en} fil={sub?.name_fil ?? group.name_fil} />
        </Link>
      ) : null}

      {item.draft ? (
        <p
          role="note"
          className="flex items-start gap-2 rounded-tile border border-dashed border-ink-4 bg-surface p-3 text-sm text-ink-2"
        >
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Not reviewed yet: this entry was drafted with AI from official sources and the iTapon team
          hasn&apos;t checked it. If your barangay or city says otherwise, follow them.
        </p>
      ) : null}

      <header className="flex items-start gap-4">
        <BinTile category={item.bin} size="lg" />
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink md:text-4xl">
            <Bi en={item.name_en} fil={item.name_fil} />
          </h1>
          <p className="text-sm text-ink-3">
            <Bi en={item.name_fil} fil={item.name_en} />
          </p>
          <p className={cn("mt-1 text-sm font-semibold", bin.text)}>
            {bin.name} · {bin.binLabel}
            {item.resin_code ? (
              <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs text-ink-2">
                Resin #{item.resin_code}
              </span>
            ) : null}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <LangToggle />
        <ReadEntryButton
          en={spoken(item.name_en, bin.binLabel, item.summary_en, item.prep_en)}
          fil={spoken(
            item.name_fil,
            bin.binLabel,
            item.summary_fil ?? item.summary_en,
            item.prep_fil.length ? item.prep_fil : item.prep_en,
          )}
        />
      </div>

      {hazardous && item.hazard_en ? (
        <div role="note" className="flex items-start gap-3 rounded-tile bg-bin-red-tint p-4">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-[#c4282d]" />
          <p className="text-sm font-medium text-ink">
            <Bi en={item.hazard_en} fil={item.hazard_fil} />
          </p>
        </div>
      ) : null}

      <p className="text-lg text-ink md:text-xl">
        <Bi en={item.summary_en} fil={item.summary_fil} />
      </p>

      {item.prep_en.length ? (
        <Section title={<Bi en="How to prepare it" fil="Paano ihanda" />}>
          <InLang lang="en">
            <StepList steps={item.prep_en} />
          </InLang>
          <InLang lang="fil">
            <StepList steps={item.prep_fil.length ? item.prep_fil : item.prep_en} />
          </InLang>
          {item.note_en ? (
            <p className="text-sm text-ink-3">
              <Bi en={item.note_en} fil={item.note_fil} />
            </p>
          ) : null}
        </Section>
      ) : null}

      {item.dont_en.length ? (
        <Section
          title={<Bi en="Don't" fil="Huwag" />}
          icon={<CircleSlash aria-hidden className="size-4 text-[#c4282d]" />}
        >
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
            {item.dont_en.map((d, i) => (
              <li key={d}>
                <Bi en={d} fil={item.dont_fil[i]} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {others.length || (item.value && VALUE_LINE[item.value]) ? (
        <Section
          title={<Bi en="Where else it can go" fil="Saan pa puwedeng dalhin" />}
          icon={<MapPin aria-hidden className="size-4 text-brand-strong" />}
        >
          {item.value && VALUE_LINE[item.value] ? (
            <p className="text-sm font-medium text-ink">{VALUE_LINE[item.value]}</p>
          ) : null}
          <ul className="flex flex-wrap gap-2">
            {others.map((d, i) => (
              <li key={d.code}>
                <Link
                  href={`/library/dropoff?type=${d.code}`}
                  className="inline-flex min-h-9 items-center rounded-full bg-brand-tint px-3 text-sm font-medium text-brand-strong hover:underline"
                >
                  <Bi en={d.name_en} fil={othersFil[i]?.name_en} />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <CampusNotes slug={item.slug} material={item.material} />

      {rules.length ? (
        <Section title={<Bi en="Local rules" fil="Lokal na patakaran" />}>
          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li key={r.note_en} className="rounded-tile bg-surface p-3 text-sm text-ink-2">
                <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-ink">
                  {r.lgu ? (LGU_NAMES[r.lgu] ?? r.lgu) : "Your campus"}
                  {r.draft ? " · draft" : ""}
                </span>
                <Bi en={r.note_en} fil={r.note_fil} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {ideas.length ? (
        <Section
          title={<Bi en="Reuse and reduce" fil="Gamitin ulit at bawasan" />}
          icon={<Repeat2 aria-hidden className="size-4 text-brand-strong" />}
        >
          <ul className="flex flex-col gap-3">
            {ideas.map((idea) => (
              <li key={idea.en} className="rounded-tile bg-card p-3 shadow-card">
                <p className="text-sm text-ink">
                  <span className="mr-1 text-xs font-semibold text-ink-3 uppercase">
                    {idea.kind === "reuse" ? "Reuse" : "Reduce"}
                  </span>
                  <Bi en={idea.en} fil={idea.fil} />
                </p>
                <IdeaActions slug={item.slug} idea={idea.en} source={source} className="mt-2" />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {item.fact_en ? (
        <div className="flex items-start gap-3 rounded-tile bg-brand-tint p-4">
          <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-strong" />
          <p className="text-sm text-ink">
            <Bi en={item.fact_en} fil={item.fact_fil} />
          </p>
        </div>
      ) : null}

      <ItemLinks
        items={confused}
        label={<Bi en="Commonly confused with" fil="Madalas mapagkamalan" />}
      />
      <ItemLinks items={related} label={<Bi en="Related items" fil="Kaugnay" />} />

      {sources.length ? (
        <Section title={<Bi en="Sources" fil="Pinagmulan" />}>
          <ul className="flex flex-col gap-1 text-sm">
            {sources.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-start gap-1 text-brand-strong underline"
                >
                  {s.title}
                  <ExternalLink aria-hidden className="mt-1 size-3 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-3">
            Rules can differ by city or barangay. When in doubt, ask your barangay or LGU.
          </p>
        </Section>
      ) : null}
    </article>
  );
}
