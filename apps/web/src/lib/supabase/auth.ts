// SPDX-License-Identifier: AGPL-3.0-or-later
// Auth for Phase 16. Guests are anonymous Supabase users (created on first scan or here).
// "Create an account" gives that same user an email and password (supabase updateUser), so it
// keeps the same id and every scan stays. Returning users sign in with email + password.
// D24: no emails are sent (no SMTP): email confirmation is off and there's no password reset
// by email; the team resets passwords in the Supabase dashboard.
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

export const MIN_PASSWORD = 8;

/** Turns Supabase auth errors into short, user-facing messages (pure; tested). */
export function authMessage(message: string): string {
  if (/already|registered|exists/i.test(message))
    return "That email already has an iTapon account. Use “Sign in” instead (scans made here as a guest won't move over).";
  if (/invalid login|invalid credentials/i.test(message)) return "Wrong email or password.";
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(message))
    return "Please enter a valid email address.";
  if (/password/i.test(message) && /(short|least|weak|characters)/i.test(message))
    return `Use a password of at least ${MIN_PASSWORD} characters.`;
  if (/rate limit|too many/i.test(message))
    return "Too many tries. Wait a few minutes and try again.";
  return message;
}

/**
 * Create an account with email + password (D24: no emails are sent, so email confirmation
 * is off in Supabase). A guest's anonymous user becomes the account, so every scan stays.
 */
export async function createAccount(email: string, password: string): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Accounts aren't available right now." };
  if (password.length < MIN_PASSWORD)
    return { error: `Use a password of at least ${MIN_PASSWORD} characters.` };
  const userId = await ensureUserId(); // guest who hasn't scanned yet still gets an account
  if (!userId) return { error: "Couldn't start a session. Check your connection." };
  // Two steps: Supabase only lets an anonymous user set a password once it has an email.
  const first = await sb.auth.updateUser({ email: email.trim() });
  if (first.error) return { error: authMessage(first.error.message) };
  if (!first.data.user?.email) {
    // Still waiting for a confirmation email: the "Confirm email" setting is on.
    return {
      error:
        "Email confirmation is still switched on in Supabase, so the account can't be finished here. Ask the iTapon team.",
    };
  }
  const second = await sb.auth.updateUser({ password });
  return second.error ? { error: authMessage(second.error.message) } : {};
}

/** Sign in on another device. Scans made there as a guest stay with that guest. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Accounts aren't available right now." };
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { error: authMessage(error.message) } : {};
}

export async function changePassword(password: string): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Accounts aren't available right now." };
  if (password.length < MIN_PASSWORD)
    return { error: `Use a password of at least ${MIN_PASSWORD} characters.` };
  const { error } = await sb.auth.updateUser({ password });
  return error ? { error: authMessage(error.message) } : {};
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
