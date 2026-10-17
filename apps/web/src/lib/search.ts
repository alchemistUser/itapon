// SPDX-License-Identifier: AGPL-3.0-or-later
// Bin Guide search (Phase 15): fuzzy match on English names, Filipino names and aliases
// (e.g. "saging", "bote", "upos"), so typos and Taglish still find the right bin.
import Fuse from "fuse.js";

import type { ItemContent } from "@/lib/content";

export function createItemSearch(items: ItemContent[]) {
  const fuse = new Fuse(items, {
    keys: [
      { name: "name", weight: 0.5 },
      { name: "nameFil", weight: 0.3 },
      { name: "aliases", weight: 0.4 },
    ],
    threshold: 0.3, // 0.34 let "saging" also match "basag" (broken glass)
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  return (query: string, limit = 8): ItemContent[] => {
    const q = query.trim();
    if (q.length < 2) return [];
    return fuse.search(q, { limit }).map((r) => r.item);
  };
}
