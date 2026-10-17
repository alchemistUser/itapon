// SPDX-License-Identifier: AGPL-3.0-or-later
// Item → bin mapping and copy for the scanner (Phase 13 task 1).
// Starts from the bundled copy (instant, offline), then refreshes from Supabase
// `waste_items` once per tab, so admin edits (Phase 19) reach users without a redeploy.
// Kept in localStorage so a returning visitor sees the latest copy even offline.
"use client";

import { useSyncExternalStore } from "react";

import { ITEMS, type ItemContent } from "@/lib/content";
import type { Category } from "@/lib/detector/types";
import { getSupabase } from "@/lib/supabase/client";

const STORAGE_KEY = "itapon-items-v1";
const CATEGORIES = new Set<Category>(["biodegradable", "recyclable", "residual", "hazardous"]);

let items = new Map(ITEMS.map((i) => [i.classKey, i]));
let source: "bundled" | "cached" | "supabase" = "bundled";
let started = false;
const listeners = new Set<() => void>();

function publish(next: ItemContent[], from: typeof source) {
  items = new Map([...items, ...next.map((i) => [i.classKey, i] as const)]);
  source = from;
  for (const l of listeners) l();
}

function loadCached() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) publish(JSON.parse(raw) as ItemContent[], "cached");
  } catch {
    /* private mode / bad JSON: keep bundled */
  }
}

async function refresh() {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from("waste_items")
    .select(
      "class_key, display_name, display_name_fil, category_key, is_detectable, short_instruction, reuse_tip, prep_steps, why_text, contamination_note, search_aliases",
    );
  if (error || !data?.length) return;
  const next: ItemContent[] = data
    .filter((r) => CATEGORIES.has(r.category_key as Category))
    .map((r) => ({
      classKey: r.class_key,
      name: r.display_name,
      nameFil: r.display_name_fil ?? undefined,
      category: r.category_key as Category,
      detectable: r.is_detectable,
      instruction: r.short_instruction,
      reuseTip: r.reuse_tip ?? undefined,
      steps: Array.isArray(r.prep_steps)
        ? (r.prep_steps as { title: string; detail: string }[])
        : [],
      why: r.why_text ?? undefined,
      contaminationNote: r.contamination_note ?? undefined,
      aliases: r.search_aliases ?? [],
    }));
  publish(next, "supabase");
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  loadCached();
  void refresh().catch(() => {});
}

export function getItemLive(classKey: string): ItemContent | undefined {
  start();
  return items.get(classKey);
}

function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Re-renders when fresher content arrives; returns where the current content came from. */
export function useContentSource() {
  return useSyncExternalStore(
    subscribe,
    () => source,
    () => "bundled" as const,
  );
}
