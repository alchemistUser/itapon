// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { BookOpen, History, Scan, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  longLabel: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/scan", label: "Scan", longLabel: "Scan", icon: Scan },
  { href: "/guide", label: "Guide", longLabel: "Bin Guide", icon: BookOpen },
  { href: "/history", label: "History", longLabel: "History", icon: History },
];

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(`${href}/`);
}

/** Mobile tab bar (Figma iPhone frames). Hidden from md up. */
export function BottomTabs() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const on = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium",
                  on ? "text-brand-strong" : "text-ink-3",
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={on ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Tablet: segmented pill with icons (iPad frame). Desktop: text tabs (website frame). */
export function TopNav() {
  const isActive = useActive();
  return (
    <header className="sticky top-0 z-30 hidden border-b border-line/60 bg-surface/90 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-8">
        <Logo />
        <nav aria-label="Main">
          {/* md: iPad segmented control */}
          <ul className="flex rounded-card bg-white p-1 shadow-card lg:hidden">
            {NAV.map(({ href, label, icon: Icon }) => {
              const on = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex min-w-24 flex-col items-center gap-0.5 rounded-tile px-4 py-1.5 text-xs font-medium",
                      on ? "bg-brand-tint text-brand-strong" : "text-ink-3 hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-5" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* lg+: website text tabs */}
          <ul className="hidden items-center gap-8 lg:flex">
            <li>
              <Link href="/#how-it-works" className="text-sm text-ink-2 hover:text-ink">
                How it works
              </Link>
            </li>
            {NAV.map(({ href, longLabel }) => {
              const on = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "border-b-2 py-5 text-sm",
                      on
                        ? "border-brand font-medium text-brand-strong"
                        : "border-transparent text-ink-2 hover:text-ink",
                    )}
                  >
                    {longLabel}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
