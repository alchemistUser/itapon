// SPDX-License-Identifier: AGPL-3.0-or-later
// User preferences (Phase 17): auto read-aloud, speech language, text size.
// Applied instantly from localStorage (works for guests, offline, before sign-in), and
// synced to profiles.prefs when there is an account so they follow the user (Phase 16).
"use client";

import { useSyncExternalStore } from "react";

import { ensureUserId, getSupabase } from "@/lib/supabase/client";

export interface Prefs {
  tts_auto?: boolean;
  language?: "en" | "fil";
  text_size?: "normal" | "large";
}

const SLOT = "itapon-prefs";
let prefs: Prefs = {};
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  applyToDocument(prefs);
  for (const l of listeners) l();
}

/** Text size scales every rem-based size (Tailwind) via the root font size. */
function applyToDocument(p: Prefs) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.text = p.text_size === "large" ? "large" : "normal";
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    prefs = JSON.parse(localStorage.getItem(SLOT) ?? "{}") as Prefs;
  } catch {
    prefs = {};
  }
  applyToDocument(prefs);
  // Then prefer the account's copy (e.g. set on another device).
  const sb = getSupabase();
  if (!sb) return;
  void sb.auth.getSession().then(async ({ data }) => {
    const id = data.session?.user.id;
    if (!id) return;
    const { data: row } = await sb.from("profiles").select("prefs").eq("id", id).maybeSingle();
    const remote = (row?.prefs ?? {}) as Prefs;
    if (Object.keys(remote).length) {
      prefs = { ...prefs, ...remote };
      persistLocal();
      emit();
    }
  });
}

function persistLocal() {
  try {
    localStorage.setItem(SLOT, JSON.stringify(prefs));
  } catch {
    /* private mode */
  }
}

export function getPrefs(): Prefs {
  load();
  return prefs;
}

/** Update preferences; returns false if the account copy couldn't be saved. */
export async function setPrefs(patch: Prefs): Promise<boolean> {
  load();
  prefs = { ...prefs, ...patch };
  persistLocal();
  emit();
  const sb = getSupabase();
  if (!sb) return true;
  const id = await ensureUserId();
  if (!id) return false;
  const { error } = await sb
    .from("profiles")
    .update({ prefs: { ...prefs } })
    .eq("id", id);
  return !error;
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

const EMPTY: Prefs = {};

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, () => EMPTY);
}
