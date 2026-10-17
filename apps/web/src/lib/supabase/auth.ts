// SPDX-License-Identifier: AGPL-3.0-or-later
// Auth for Phase 16. Guests are anonymous Supabase users (created on first scan or here).
// "Save your history" attaches an email to that same user (supabase updateUser): after the
// emailed link is opened the account is permanent and keeps the same id, so every scan
// stays. Returning users on another device sign in with a magic link.
//
// Sessions live in localStorage (supabase-js). All data is read in the browser under RLS
// and every page is prerendered, so no server-side session (proxy/middleware) is needed.
"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { ensureUserId, getSupabase } from "./client";

export interface AuthState {
  loading: boolean;
  user: User | null;
  isAnonymous: boolean;
  /** Email waiting for confirmation after "Save your history". */
  pendingEmail: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    isAnonymous: true,
    pendingEmail: null,
  });

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    const apply = (user: User | null) =>
      !cancelled &&
      setState({
        loading: false,
        user,
        isAnonymous: user?.is_anonymous ?? true,
        pendingEmail: user?.new_email ?? null,
      });
    void getSupabase().then((sb) => {
      if (cancelled) return;
      if (!sb) return setState((s) => ({ ...s, loading: false }));
      sb.auth.getUser().then(({ data }) => apply(data.user));
      const { data } = sb.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}

const redirectTo = (path: string) =>
  typeof window === "undefined" ? undefined : `${window.location.origin}${path}`;

/** Keep this device's (anonymous) history by attaching an email to the same account. */
export async function saveHistoryWithEmail(email: string): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Accounts aren't available right now." };
  const userId = await ensureUserId(); // guest who hasn't scanned yet still gets an account
  if (!userId) return { error: "Couldn't start a session. Check your connection." };
  const { error } = await sb.auth.updateUser(
    { email: email.trim() },
    { emailRedirectTo: redirectTo("/account?saved=1") },
  );
  if (error) {
    return {
      error: /already|registered|exists/i.test(error.message)
        ? "That email already has an iTapon account. Use “Sign in” instead (scans on this device won't move over)."
        : /invalid/i.test(error.message)
          ? "Please enter a valid email address you can open."
          : error.message,
    };
  }
  return {};
}

/** Magic-link sign-in for an existing account (e.g. on a new device). */
export async function signInWithEmail(email: string): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Accounts aren't available right now." };
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo("/history") },
  });
  return error ? { error: error.message } : {};
}

/** Google sign-in (needs the Google provider + manual linking enabled in Supabase). */
export async function continueWithGoogle(isAnonymous: boolean): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Accounts aren't available right now." };
  // Redirect flow, not a popup: popups don't work with the site's COOP same-origin header.
  const opts = { provider: "google" as const, options: { redirectTo: redirectTo("/history") } };
  const { error } = isAnonymous
    ? await sb.auth.linkIdentity(opts)
    : await sb.auth.signInWithOAuth(opts);
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await (await getSupabase())?.auth.signOut();
}
