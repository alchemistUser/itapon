// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Bike,
  Bird,
  Cloud,
  Droplet,
  Fish,
  Flower2,
  Leaf,
  Mountain,
  Recycle,
  Sprout,
  Sun,
  TreePine,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";

const ICONS: Record<string, { icon: LucideIcon; bg: string }> = {
  leaf: { icon: Leaf, bg: "bg-bin-green" },
  sprout: { icon: Sprout, bg: "bg-[#2f9e5b]" },
  tree: { icon: TreePine, bg: "bg-[#1f7a4a]" },
  flower: { icon: Flower2, bg: "bg-[#b5487a]" },
  sun: { icon: Sun, bg: "bg-[#c77c0a]" },
  cloud: { icon: Cloud, bg: "bg-[#4f6b8a]" },
  drop: { icon: Droplet, bg: "bg-brand-button" },
  fish: { icon: Fish, bg: "bg-[#0e7c86]" },
  bird: { icon: Bird, bg: "bg-[#7a5af5]" },
  bike: { icon: Bike, bg: "bg-[#3d4a5c]" },
  recycle: { icon: Recycle, bg: "bg-brand-strong" },
  mountain: { icon: Mountain, bg: "bg-[#6b5b45]" },
};

/** Preset avatar (Phase 31: no photo uploads). Unknown or empty keys show a neutral icon. */
export function Avatar({ value, className }: { value: string | null; className?: string }) {
  const entry = value ? ICONS[value.split("-")[0]] : undefined;
  const Icon = entry?.icon ?? UserRound;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-white",
        entry?.bg ?? "bg-ink-4",
        className,
      )}
    >
      <Icon className="size-1/2" strokeWidth={2.25} />
    </span>
  );
}
