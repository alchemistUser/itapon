// SPDX-License-Identifier: AGPL-3.0-or-later
// Library search (Phase 30): names, Filipino/Taglish, aliases, brand words, materials and
// resin codes ("#5", "PP", "pet"). Typo-tolerant like the Phase 15 Bin Guide search, with a
// looser "did you mean" when nothing matches.
import Fuse from "fuse.js";

import { groupOf } from "./core";
import type { LibraryIndexItem, LibraryMaterial } from "./types";

const RESIN_WORDS: Record<string, number> = {
  pet: 1,
  pete: 1,
  hdpe: 2,
  pvc: 3,
  ldpe: 4,
  pp: 5,
  ps: 6,
};

/** "#5", "5", "pp", "pp5", "#5 pp", "resin 2" → 5 / 2; otherwise null (pure; tested). */
export function resinQuery(query: string): number | null {
  const q = query
    .toLowerCase()
    .replace(/\b(resin|code|number|plastic)\b/g, "")
    .replace(/[\s#-]+/g, "");
  if (!q) return null;
  const digit = q.match(/^([1-7])([a-z]*)$/) ?? q.match(/^([a-z]+)([1-7])$/);
  if (digit) {
    const [n, word] = /\d/.test(digit[1])
      ? [Number(digit[1]), digit[2]]
      : [Number(digit[2]), digit[1]];
    if (!word || RESIN_WORDS[word] === n || (word === "other" && n === 7)) return n;
    return null;
  }
  return RESIN_WORDS[q] ?? null;
}

interface Entry {
  item: LibraryIndexItem;
  name: string;
  nameFil: string;
  aliases: string[];
  materials: string[];
}

export interface LibrarySearchResult {
  items: LibraryIndexItem[];
  /** Closest item name when nothing matched (typo), e.g. "Did you mean Styrofoam?" */
  didYouMean?: LibraryIndexItem;
}

export function createLibrarySearch(items: LibraryIndexItem[], materials: LibraryMaterial[]) {
  const mat = new Map(materials.map((m) => [m.code, m]));
  const entries: Entry[] = items.map((item) => {
    const sub = mat.get(item.material);
    const group = mat.get(groupOf(item.material));
    return {
      item,
      name: item.name_en,
      nameFil: item.name_fil,
      aliases: item.aliases,
      materials: [sub?.name_en, sub?.name_fil, group?.name_en, group?.name_fil].filter(
        (s): s is string => !!s,
      ),
    };
  });
  const keys = [
    { name: "name", weight: 0.5 },
    { name: "nameFil", weight: 0.35 },
    { name: "aliases", weight: 0.4 },
    { name: "materials", weight: 0.15 },
  ];
  const fuse = new Fuse(entries, {
    keys,
    threshold: 0.3, // same as the Bin Guide (0.34 let "saging" match "basag")
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  const loose = new Fuse(entries, {
    keys: keys.slice(0, 3),
    threshold: 0.5,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return (query: string, limit = 10): LibrarySearchResult => {
    const q = query.trim();
    if (q.length < 1) return { items: [] };
    const resin = resinQuery(q);
    if (resin !== null) {
      const hits = items
        .filter((i) => i.resin_code === resin || i.material === `PLA-${resin}`)
        .sort((a, b) => a.name_en.localeCompare(b.name_en));
      return { items: hits.slice(0, limit) };
    }
    if (q.length < 2) return { items: [] };
    const hits = fuse.search(q, { limit }).map((r) => r.item.item);
    if (hits.length) return { items: hits };
    const guess = loose.search(q, { limit: 1 })[0]?.item.item;
    return { items: [], didYouMean: guess };
  };
}
