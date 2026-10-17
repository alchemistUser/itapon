// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser Supabase client (Phase 13). Every visitor gets an anonymous user on first need,
// so scans can be logged under RLS without a sign-up wall (Phase 10 design).
// Phase 16 adds @supabase/ssr cookies, email/Google sign-in and identity linking.
"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/** Accepts the full project URL or just the project ref ("svvbvkdkgduyphkkaiio"). */
export function normalizeSupabaseUrl(value: string | undefined): string | null {
  const v = value?.trim().replace(/\/+$/, "");
  if (!v) return null;
  if (/^[a-z0-9]{20}$/.test(v)) return `https://${v}.supabase.co`;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** Known at build time; use it for render-time checks (no client needed). */
export const supabaseConfigured = !!(url && anonKey);

let client: Promise<SupabaseClient<Database> | null> | undefined;

/**
 * null when Supabase isn't configured (the app still works: bundled content, no logging).
 * supabase-js (~85 KB gzipped) is loaded on first use, not in every page's bundle (Phase 21).
 */
export function getSupabase(): Promise<SupabaseClient<Database> | null> {
  client ??= (async () => {
    if (!url || !anonKey) return null;
    try {
      const { createClient } = await import("@supabase/supabase-js");
      return createClient<Database>(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: "itapon-auth" },
      });
    } catch (e) {
      console.warn("[itapon] Supabase is unavailable; scans won't be logged.", e);
      client = undefined; // e.g. offline before the chunk was cached: try again later
      return null;
    }
  })();
  return client;
}

let pendingUser: Promise<string | null> | null = null;

/** Current user id, signing in anonymously if needed. Never throws; null if unavailable. */
export function ensureUserId(): Promise<string | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  pendingUser ??= (async () => {
    try {
      const sb = await getSupabase();
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      if (data.session) return data.session.user.id;
      const { data: signed, error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      return signed.user?.id ?? null;
    } catch (e) {
      console.warn("[itapon] Supabase sign-in failed; scans won't be logged.", e);
      return null;
    } finally {
      pendingUser = null;
    }
  })();
  return pendingUser;
}
