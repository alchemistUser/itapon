// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser side of the library (Phase 30). The library is too big to bundle into page
// JavaScript, so it loads on first need from public/library: a small index (search, the
// post-scan card) and one file per material group. The service worker keeps every file it
// has served (stale-while-revalidate), so the library keeps working offline.
"use client";

import { useSyncExternalStore } from "react";

import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

import { groupOf } from "./core";
import type { LibraryGroupFile, LibraryIndex, LibraryItem } from "./types";

let index: LibraryIndex | null | undefined; // undefined: not loaded yet; null: unavailable
let indexPromise: Promise<LibraryIndex | null> | null = null;
const listeners = new Set<() => void>();
const groups = new Map<string, Promise<LibraryGroupFile | null>>();

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null; // offline and never cached
  }
}

export function loadLibraryIndex(): Promise<LibraryIndex | null> {
  indexPromise ??= getJson<LibraryIndex>("/library/index.json").then((data) => {
    index = data;
    if (!data) indexPromise = null; // try again next time (e.g. back online)
    for (const l of listeners) l();
    return data;
  });
  return indexPromise;
}

/** One material group's full entries (versioned, so an update never mixes old and new). */
export function loadLibraryGroup(code: string, version: string): Promise<LibraryGroupFile | null> {
  const key = `${code}@${version}`;
  let p = groups.get(key);
  if (!p) {
    p = getJson<LibraryGroupFile>(`/library/groups/${code}.json?v=${encodeURIComponent(version)}`);
    groups.set(key, p);
    void p.then((d) => d || groups.delete(key));
  }
  return p;
}

export async function loadLibraryItem(slug: string): Promise<LibraryItem | null> {
  const idx = await loadLibraryIndex();
  const entry = idx?.items.find((i) => i.slug === slug);
  if (!idx || !entry) return null;
  const file = await loadLibraryGroup(groupOf(entry.material), idx.content_version);
  return file?.items.find((i) => i.slug === slug) ?? null;
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (index === undefined) void loadLibraryIndex();
  return () => listeners.delete(l);
}

/** The index once loaded: undefined while loading, null if unavailable (offline, uncached). */
export function useLibraryIndex(): LibraryIndex | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => index,
    () => undefined,
  );
}

// ---------------------------------------------------------------- usage counts

/** viewed an entry · used "Which one is yours?" · "I'll do this" · "Done it" */
export type LibraryEvent = "view" | "chooser" | "idea_plan" | "idea_done";
export type LibraryEventSource = "scan" | "library" | "kiosk";

const sent = new Set<string>();

/**
 * Counts library use per item (Phase 30). No account, device or scan id is sent; the
 * server adds the institution only when the visitor already belongs to one. Best effort:
 * offline events are dropped. At most one of each per item and page load.
 */
export function logLibraryEvent(slug: string, event: LibraryEvent, source: LibraryEventSource) {
  if (!supabaseConfigured || typeof window === "undefined") return;
  const key = `${slug}:${event}:${source}`;
  if (sent.has(key) || sent.size > 200) return;
  sent.add(key);
  void getSupabase()
    .then((sb) => sb?.from("library_events").insert({ item_slug: slug, event, source }))
    .catch(() => {});
}

const missed = new Set<string>();

/**
 * "Not found" loop (Phase 34): a search with no result is sent, without any id, so the team
 * knows what to write next. The server drops emails, long numbers and links. Once per query
 * and page load.
 */
export function logSearchMiss(query: string) {
  const q = query.trim().toLowerCase();
  if (!supabaseConfigured || q.length < 3 || missed.has(q) || missed.size > 50) return;
  if (typeof navigator !== "undefined" && navigator.webdriver) return; // automated tests
  missed.add(q);
  void getSupabase()
    .then((sb) => sb?.rpc("log_search_miss", { p_query: q }))
    .catch(() => {});
}

export interface CampusNoteView {
  noteEn: string;
  noteFil: string | null;
}

/**
 * The member's own institution's published notes for an item, its subgroup or its group
 * (Phase 34). RLS returns only the caller's institution; nothing for guests without one.
 */
export async function fetchCampusNotes(slug: string, material: string): Promise<CampusNoteView[]> {
  if (!supabaseConfigured) return [];
  const sb = await getSupabase();
  if (!sb || !(await sb.auth.getSession()).data.session) return [];
  const group = groupOf(material);
  const { data } = await sb
    .from("library_local_rules")
    .select("note_en, note_fil, item_slug, material_code")
    .not("institution_id", "is", null)
    .eq("status", "published")
    .or(`item_slug.eq.${slug},material_code.in.(${material},${group})`);
  return (data ?? []).map((r) => ({ noteEn: r.note_en, noteFil: r.note_fil }));
}
