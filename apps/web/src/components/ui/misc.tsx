// SPDX-License-Identifier: AGPL-3.0-or-later
import { Recycle, Search } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2 text-lg font-bold text-ink", className)}
    >
      <span className="flex size-8 items-center justify-center rounded-[9px] bg-bin-blue text-white">
        <Recycle aria-hidden className="size-5" strokeWidth={2.5} />
      </span>
      iTapon
    </Link>
  );
}

export function SearchInput({
  className,
  label = "Search an item",
  ...props
}: ComponentProps<"input"> & { label?: string }) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
      />
      <input
        type="search"
        className="h-11 w-full rounded-control border border-line bg-white pr-3 pl-9 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none"
        {...props}
      />
    </label>
  );
}

/** Source link required by AGPL-3.0 (D2). */
export function SourceFooter({ className }: { className?: string }) {
  const url = process.env.NEXT_PUBLIC_SOURCE_URL || "https://github.com/alchemistUser/itapon";
  return (
    <footer className={cn("px-4 py-6 text-center text-xs text-ink-3", className)}>
      iTapon is open source (AGPL-3.0).{" "}
      <a href={url} className="font-medium text-brand-strong underline" rel="noreferrer">
        View the source code
      </a>
      {" · "}
      <Link href="/privacy" className="font-medium text-brand-strong underline">
        Privacy
      </Link>
      <span className="ml-1 text-ink-4">· v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
    </footer>
  );
}
