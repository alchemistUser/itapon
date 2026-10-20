// SPDX-License-Identifier: AGPL-3.0-or-later
// Server-only copy of the library for prerendering the /library pages. Only server
// components may import this file: the browser loads public/library/*.json lazily instead,
// so the library never adds to the scanner's JavaScript (Phase 30 budget).
import raw from "@/content/library.json";

import { groupOf } from "./core";
import type { LibraryData, LibraryItem, LibraryMaterial } from "./types";

export const LIBRARY = raw as unknown as LibraryData;

const BY_SLUG = new Map(LIBRARY.items.map((i) => [i.slug, i]));
const BY_CODE = new Map(LIBRARY.materials.map((m) => [m.code, m]));

export const getLibraryItem = (slug: string): LibraryItem | undefined => BY_SLUG.get(slug);

export const getMaterial = (code: string): LibraryMaterial | undefined => BY_CODE.get(code);

/** Group from a URL segment ("pla"), if it exists. */
export function groupFromPath(seg: string): LibraryMaterial | undefined {
  const m = BY_CODE.get(seg.toUpperCase());
  return m && !m.parent ? m : undefined;
}

/** Subgroup from URL segments ("pla", "pla-1"), if it belongs to that group. */
export function subgroupFromPath(group: string, seg: string): LibraryMaterial | undefined {
  const m = BY_CODE.get(seg.toUpperCase());
  return m && m.parent === group.toUpperCase() ? m : undefined;
}

export function groupForItem(item: LibraryItem): LibraryMaterial | undefined {
  return BY_CODE.get(groupOf(item.material));
}

export const SOURCES = new Map(LIBRARY.sources.map((s) => [s.id, s]));
