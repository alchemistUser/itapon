// SPDX-License-Identifier: AGPL-3.0-or-later
// UI metadata for the four bins. Names/labels mirror supabase/content/waste_content.json;
// class names are spelled out in full so Tailwind can see them.
import type { Category } from "@/lib/detector/types";

export interface BinMeta {
  key: Category;
  name: string;
  shortName: string; // bin-row label ("Hazard" in Figma)
  binLabel: string;
  colorWord: string; // "blue" in "drop it in the blue bin"
  solid: string; // bg for active tiles / icons
  pale: string; // bg for inactive tiles
  tint: string; // chip / icon-well background
  text: string; // coloured text on white (AA contrast)
  examples: string;
}

export const BINS: Record<Category, BinMeta> = {
  biodegradable: {
    key: "biodegradable",
    name: "Biodegradable",
    shortName: "Biodegradable",
    binLabel: "Green Bin",
    colorWord: "green",
    solid: "bg-bin-green",
    pale: "bg-bin-green-pale",
    tint: "bg-bin-green-tint",
    text: "text-[#1a7f37]",
    examples: "Food scraps, fruit peels, leaves, used tissue paper",
  },
  recyclable: {
    key: "recyclable",
    name: "Recyclable",
    shortName: "Recyclable",
    binLabel: "Blue Bin",
    colorWord: "blue",
    solid: "bg-bin-blue",
    pale: "bg-bin-blue-pale",
    tint: "bg-bin-blue-tint",
    text: "text-brand-strong",
    examples: "Plastic bottles, glass, metal, clean paper",
  },
  residual: {
    key: "residual",
    name: "Residual",
    shortName: "Residual",
    binLabel: "Black Bin",
    colorWord: "black",
    solid: "bg-bin-black",
    pale: "bg-bin-black-pale",
    tint: "bg-bin-black-tint",
    text: "text-ink",
    examples: "Mixed garbage, soiled packaging, and sanitary waste",
  },
  hazardous: {
    key: "hazardous",
    name: "Hazardous waste",
    shortName: "Hazard",
    binLabel: "Red Bin",
    colorWord: "red",
    solid: "bg-bin-red",
    pale: "bg-bin-red-pale",
    tint: "bg-bin-red-tint",
    text: "text-[#c4282d]",
    examples: "Chemicals, batteries, busted light bulbs, and expired medicines",
  },
};

/** Figma display order: Biodegradable → Recyclable → Residual → Hazardous. */
export const BIN_ORDER: Category[] = ["biodegradable", "recyclable", "residual", "hazardous"];
