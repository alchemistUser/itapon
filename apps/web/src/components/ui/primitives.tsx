// SPDX-License-Identifier: AGPL-3.0-or-later
// Small presentational building blocks used across screens.
import { Info } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-card p-4 shadow-card", className)} {...props} />;
}

/** "95% sure" pill (Figma). */
export function ConfidenceBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-strong",
        className,
      )}
    >
      {Math.round(value * 100)}% sure
    </span>
  );
}

/** Small uppercase label above a heading ("DETECTED ITEM", "BEST NEXT STEP"). */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[11px] font-semibold tracking-wide text-ink-3 uppercase", className)}
      {...props}
    />
  );
}

/** Numbered preparation steps ("Before you sort"). */
export function StepList({ steps }: { steps: { title: string; detail: string }[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-3">
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-strong"
          >
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{s.title}</p>
            <p className="text-sm text-ink-3">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Blue "Why this recommendation?" box. */
export function InfoCallout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-tile bg-brand-tint p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-brand-strong">{children}</p>
    </div>
  );
}

/** Grey footnote with an info icon ("Bin colors follow your app's local guide…"). */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-ink-3", className)}>
      <Info aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function SectionHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {aside ? <span className="text-xs text-ink-3">{aside}</span> : null}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header>
      <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink md:text-4xl">
        {title}
      </h1>
      {subtitle ? <p className="mt-1 text-sm text-ink-3 md:text-base">{subtitle}</p> : null}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-tile bg-line", className)} />;
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card bg-card px-6 py-10 text-center shadow-card">
      <div className="text-ink-4">{icon}</div>
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="text-sm text-ink-3">{children}</div> : null}
    </div>
  );
}
