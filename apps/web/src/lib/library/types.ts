// SPDX-License-Identifier: AGPL-3.0-or-later
// Disposal library (v2 Phases 28–30). Shapes of the files that
// supabase/scripts/build_library.py writes: src/content/library.json (server, prerendering)
// and public/library/{index,groups/<G>}.json (browser, loaded lazily and cached offline).
import type { Category } from "@/lib/detector/types";

export type Lang = "en" | "fil";

export interface LibraryMaterial {
  code: string; // "PLA" (group) or "PLA-1" (subgroup)
  parent: string | null;
  name_en: string;
  name_fil: string;
  description_en: string | null;
  description_fil: string | null;
  resin_code: number | null;
  default_bin: Category | null;
}

export interface LibraryDestination {
  code: string; // bin, junkshop, ewaste, hazdrop, …
  name_en: string;
  name_fil: string;
}

/** What search and the post-scan card need (public/library/index.json). */
export interface LibraryIndexItem {
  slug: string;
  name_en: string;
  name_fil: string;
  aliases: string[];
  material: string;
  resin_code: number | null;
  bin: Category;
  summary_en: string;
  summary_fil: string | null;
  detectable_class_key: string | null;
  /** AI-drafted and not reviewed by the team yet (shown as such; D25). */
  draft: boolean;
}

export interface PrepStep {
  title: string;
  detail: string;
}

/** A full entry (public/library/groups/<G>.json and the server copy). */
export interface LibraryItem extends LibraryIndexItem {
  destinations: string[];
  prep_en: PrepStep[];
  prep_fil: PrepStep[];
  note_en: string | null;
  note_fil: string | null;
  dont_en: string[];
  dont_fil: string[];
  hazard_en: string | null;
  hazard_fil: string | null;
  value: "buys" | "accepts" | "none" | null;
  reuse_en: string[];
  reuse_fil: string[];
  reduce_en: string[];
  reduce_fil: string[];
  fact_en: string | null;
  fact_fil: string | null;
  related: string[];
  sources: string[];
  reviewed_at: string | null;
}

export interface LocalRule {
  lgu: string | null;
  item: string | null;
  material: string | null;
  note_en: string;
  note_fil: string | null;
  sources: string[];
  draft: boolean;
}

export interface DropoffPoint {
  name: string;
  destination: string;
  address: string | null;
  map_url: string | null;
  hours: string | null;
  lgu: string | null;
  notes: string | null;
  draft: boolean;
}

export interface LibrarySource {
  id: string;
  title: string;
  url: string;
  level: string;
}

export interface LibraryIndex {
  sources: LibrarySource[];
  content_version: string;
  materials: LibraryMaterial[];
  destinations: LibraryDestination[];
  items: LibraryIndexItem[];
  local_rules: LocalRule[];
  dropoffs: DropoffPoint[];
}

export interface LibraryData extends Omit<LibraryIndex, "items"> {
  sources: LibrarySource[];
  items: LibraryItem[];
}

export interface LibraryGroupFile {
  content_version: string;
  items: LibraryItem[];
}
