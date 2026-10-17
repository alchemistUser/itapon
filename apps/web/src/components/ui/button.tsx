// SPDX-License-Identifier: AGPL-3.0-or-later
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-brand-button text-white hover:bg-brand-strong",
  dark: "bg-ink text-white hover:bg-black",
  outline: "border border-ink-4/60 bg-white text-ink hover:bg-surface",
  ghost: "text-brand-strong hover:bg-brand-tint",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2", // ≥44px touch target
  lg: "h-13 px-5 text-base gap-2",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

const base =
  "inline-flex select-none items-center justify-center rounded-control font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(base, VARIANTS[variant], SIZES[size]);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}
