// SPDX-License-Identifier: AGPL-3.0-or-later
// The archive image classifier's 12 whole-image classes (model itapon-archive-mobilenetv2-v1)
// and how each maps to an app item and an RA 9003 bin. Pure data, shared by the worker, the
// content, the library card and the tests.
import type { Category } from "@/lib/detector/types";

export interface ArchiveClass {
  /** Label as the model emits it (labels.json `class_names`). */
  name: string;
  /** Item key in `waste_items` (a v1 item when one already means the same thing). */
  classKey: string;
  category: Category;
  /** Library material group to point people to, if any. */
  libraryGroup: string | null;
}

/**
 * Order does not matter here: the model's own labels file decides output order, and the
 * worker looks classes up by name. Bin mapping approved 2026-10-26 (RA 9003).
 */
export const ARCHIVE_CLASSES: ArchiveClass[] = [
  { name: "battery", classKey: "battery", category: "hazardous", libraryGroup: "BAT" },
  { name: "biological", classKey: "biological", category: "biodegradable", libraryGroup: "ORG" },
  { name: "brown-glass", classKey: "brown_glass", category: "recyclable", libraryGroup: "GLA" },
  { name: "cardboard", classKey: "cardboard", category: "recyclable", libraryGroup: "PAP" },
  { name: "clothes", classKey: "clothes", category: "residual", libraryGroup: "TEX" },
  { name: "green-glass", classKey: "green_glass", category: "recyclable", libraryGroup: "GLA" },
  { name: "metal", classKey: "metal", category: "recyclable", libraryGroup: "MET" },
  { name: "paper", classKey: "paper", category: "recyclable", libraryGroup: "PAP" },
  { name: "plastic", classKey: "plastic", category: "recyclable", libraryGroup: "PLA" },
  { name: "shoes", classKey: "shoes", category: "residual", libraryGroup: "TEX" },
  { name: "trash", classKey: "trash", category: "residual", libraryGroup: null },
  { name: "white-glass", classKey: "white_glass", category: "recyclable", libraryGroup: "GLA" },
];

export const ARCHIVE_BY_NAME = new Map(ARCHIVE_CLASSES.map((c) => [c.name, c]));
export const ARCHIVE_BY_KEY = new Map(ARCHIVE_CLASSES.map((c) => [c.classKey, c]));

/** Item keys the archive scanner can return. */
export const ARCHIVE_KEYS: string[] = ARCHIVE_CLASSES.map((c) => c.classKey);

/** Archive items that already exist as v1 (YOLO) items and keep their existing copy. */
export const SHARED_WITH_V1 = new Set(["battery", "cardboard"]);

/**
 * Items only the archive scanner returns. They have `waste_items` rows (so scans can be
 * logged and counted) but stay out of the Bin Guide, which lists specific items.
 */
export const ARCHIVE_ONLY_KEYS = new Set(ARCHIVE_KEYS.filter((k) => !SHARED_WITH_V1.has(k)));
