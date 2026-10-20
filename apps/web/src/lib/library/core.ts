// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure helpers shared by the library pages (server) and the post-scan card (browser).
import type {
  Lang,
  LibraryDestination,
  LibraryIndexItem,
  LibraryItem,
  LibraryMaterial,
  LocalRule,
} from "./types";

export const groupOf = (material: string) => material.split("-")[0];

export const LGU_NAMES: Record<string, string> = { QC: "Quezon City" };

/** "plastic_bottle" → "plastic-bottle": the v1 item migrated to the library (Phase 28). */
export const canonicalSlug = (classKey: string) => classKey.replace(/_/g, "-");

/** Library items a scanner class can be, the migrated v1 item first. */
export function candidatesFor<T extends LibraryIndexItem>(items: T[], classKey: string): T[] {
  const main = canonicalSlug(classKey);
  return items
    .filter((i) => i.detectable_class_key === classKey)
    .sort(
      (a, b) =>
        Number(b.slug === main) - Number(a.slug === main) || a.name_en.localeCompare(b.name_en),
    );
}

/** The one-line hint for "Which one is yours?". */
export function chooserTip(cands: LibraryIndexItem[]): string {
  const resins = new Set(cands.map((c) => c.resin_code).filter((r) => r !== null));
  if (resins.size > 1) return "Check the number in the triangle on the bottom.";
  if (new Set(cands.map((c) => c.bin)).size > 1)
    return "They don't all go in the same bin, so pick the closest match.";
  return "Pick the closest match for more specific tips.";
}

/** Text in the chosen language, falling back to English (Filipino is still being written). */
export function pick<T>(lang: Lang, en: T, fil: T | null | undefined): T {
  if (lang === "fil" && fil !== null && fil !== undefined && !(Array.isArray(fil) && !fil.length))
    return fil;
  return en;
}

export const nameOf = (x: { name_en: string; name_fil: string }, lang: Lang) =>
  lang === "fil" && x.name_fil ? x.name_fil : x.name_en;

/** Local notes that apply to an item: its own, its subgroup's and its group's. */
export function rulesFor(rules: LocalRule[], item: { slug: string; material: string }) {
  const group = groupOf(item.material);
  return rules.filter(
    (r) =>
      r.item === item.slug || r.material === item.material || (r.material && r.material === group),
  );
}

/** Where else it can go besides the bin, e.g. "Junk shop", "E-waste drop-off". */
export function whereElse(
  item: Pick<LibraryItem, "destinations">,
  dests: LibraryDestination[],
  lang: Lang = "en",
): LibraryDestination[] {
  const byCode = new Map(dests.map((d) => [d.code, d]));
  return item.destinations
    .filter((c) => c !== "bin")
    .map((c) => byCode.get(c))
    .filter((d): d is LibraryDestination => !!d)
    .map((d) => ({ ...d, name_en: lang === "fil" ? d.name_fil || d.name_en : d.name_en }));
}

export const VALUE_LINE: Record<string, string> = {
  buys: "Junk shops buy this.",
  accepts: "Junk shops accept this.",
};

/** The first reuse idea, else the first reduce idea. */
export function topIdea(
  item: LibraryItem,
  lang: Lang = "en",
): { kind: "reuse" | "reduce"; text: string } | null {
  const reuse = pick(lang, item.reuse_en, item.reuse_fil);
  if (reuse.length) return { kind: "reuse", text: reuse[0] };
  const reduce = pick(lang, item.reduce_en, item.reduce_fil);
  if (reduce.length) return { kind: "reduce", text: reduce[0] };
  return null;
}

/**
 * "Commonly confused with": items the scanner can't tell apart that go in a different bin
 * (same class), plus related items in a different bin (e.g. mug vs glass, PS vs PET).
 */
export function confusedWith<T extends LibraryIndexItem>(items: T[], item: LibraryItem): T[] {
  const related = new Set(item.related);
  return items.filter(
    (o) =>
      o.slug !== item.slug &&
      o.bin !== item.bin &&
      ((item.detectable_class_key && o.detectable_class_key === item.detectable_class_key) ||
        related.has(o.slug)),
  );
}

export function groupsOf(materials: LibraryMaterial[]) {
  return materials.filter((m) => !m.parent);
}

export function subgroupsOf(materials: LibraryMaterial[], group: string) {
  return materials.filter((m) => m.parent === group);
}

/** Items in a group or subgroup code, by name. */
export function itemsIn<T extends LibraryIndexItem>(items: T[], code: string): T[] {
  const sub = code.includes("-");
  return items
    .filter((i) => (sub ? i.material === code : groupOf(i.material) === code))
    .sort((a, b) => a.name_en.localeCompare(b.name_en));
}

/** URL segment for a material code: "PLA" → "pla", "PLA-1" → "pla-1". */
export const materialPath = (code: string) => {
  const g = groupOf(code).toLowerCase();
  return code.includes("-") ? `/library/${g}/${code.toLowerCase()}` : `/library/${g}`;
};
export const itemPath = (slug: string) => `/library/item/${slug}`;
