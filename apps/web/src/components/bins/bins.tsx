// SPDX-License-Identifier: AGPL-3.0-or-later
// Bin visuals: recycle tile, category chip, item icon, and the 4-bin row with arrow.
import { ArrowDown, Leaf, Package, Recycle, TriangleAlert, type LucideIcon } from "lucide-react";

import { BIN_ORDER, BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/detector/types";

const TILE_SIZES = {
  sm: { box: "size-9 rounded-[10px]", icon: "size-5" },
  md: { box: "size-14 rounded-tile", icon: "size-8" },
  lg: { box: "size-20 rounded-[18px]", icon: "size-11" },
  xl: { box: "size-24 rounded-[20px]", icon: "size-14" },
} as const;

/** Coloured rounded square with a white recycle symbol (Bin Guide, History, bin row). */
export function BinTile({
  category,
  size = "md",
  faded = false,
  className,
}: {
  category: Category;
  size?: keyof typeof TILE_SIZES;
  faded?: boolean;
  className?: string;
}) {
  const bin = BINS[category];
  const s = TILE_SIZES[size];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center text-white",
        s.box,
        faded ? bin.pale : bin.solid,
        className,
      )}
    >
      <Recycle className={s.icon} strokeWidth={2.25} />
    </span>
  );
}

const ITEM_ICONS: Record<Category, LucideIcon> = {
  biodegradable: Leaf,
  recyclable: Recycle,
  residual: Package,
  hazardous: TriangleAlert,
};

/** Tinted icon well used on item cards ("Banana peel" leaf, "Snack wrapper" box…). */
export function ItemIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = ITEM_ICONS[category];
  const bin = BINS[category];
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[10px]",
        bin.tint,
        bin.text,
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}

/** "Biodegradable · Green bin" in the bin colour. */
export function CategoryChip({ category, className }: { category: Category; className?: string }) {
  const bin = BINS[category];
  return (
    <span className={cn("text-xs font-semibold", bin.text, className)}>
      {bin.name} · {bin.binLabel.replace(" Bin", " bin")}
    </span>
  );
}

/** Instruction text with "<colour> bin" highlighted, as in Figma ("…drop it in the blue bin"). */
export function Instruction({
  text,
  category,
  className,
}: {
  text: string;
  category: Category;
  className?: string;
}) {
  const phrase = `${BINS[category].colorWord} bin`;
  const i = text.toLowerCase().indexOf(phrase);
  if (i < 0) return <p className={className}>{text}</p>;
  return (
    <p className={className}>
      {text.slice(0, i)}
      <span className={cn("font-semibold", BINS[category].text)}>
        {text.slice(i, i + phrase.length)}
      </span>
      {text.slice(i + phrase.length)}
    </p>
  );
}

/**
 * The four bin tiles with the correct one solid and arrowed (tablet/desktop result).
 * Colour is never the only signal: the active bin also gets the arrow and bold label.
 */
export function BinRow({ active, className }: { active: Category; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <p className="sr-only">Correct bin: {BINS[active].name}</p>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3" aria-hidden>
        {BIN_ORDER.map((key) => {
          const on = key === active;
          return (
            <li key={key} className="flex flex-col items-center gap-1.5">
              <ArrowDown
                className={cn("size-8 text-bin-blue", on ? "visible" : "invisible")}
                strokeWidth={3}
              />
              <span
                className={cn(
                  "flex aspect-square w-full max-w-24 items-center justify-center rounded-tile text-white",
                  on ? BINS[key].solid : BINS[key].pale,
                )}
              >
                <Recycle className="size-1/2" strokeWidth={2.25} />
              </span>
              <span
                className={cn(
                  "w-full text-center text-[11px] leading-tight break-words sm:text-xs lg:text-sm",
                  on ? "font-bold text-ink" : "text-ink-3",
                )}
              >
                {BINS[key].shortName}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
