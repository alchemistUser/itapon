// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { CheckCircle2, Mail, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, PageTitle } from "@/components/ui/primitives";
import { deleteMyData } from "@/lib/history";
import { setPrefs, usePrefs, type Prefs } from "@/lib/prefs";
import {
  continueWithGoogle,
  saveHistoryWithEmail,
  signInWithEmail,
  signOut,
  useAuth,
} from "@/lib/supabase/auth";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";
const inputCls =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

function EmailForm({ mode, onDone }: { mode: "save" | "signin"; onDone: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = mode === "save" ? await saveHistoryWithEmail(email) : await signInWithEmail(email);
    setBusy(false);
    if (res.error) setError(res.error);
    else onDone(email.trim());
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <label className="flex-1">
        <span className="sr-only">Email address</span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
        />
      </label>
      <Button type="submit" disabled={busy || !email.includes("@")}>
        <Mail aria-hidden className="size-4" />
        {busy ? "Sending…" : mode === "save" ? "Save my history" : "Email me a sign-in link"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-[#c4282d] sm:basis-full">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function AccountView() {
  const auth = useAuth();
  const [mode, setMode] = useState<"save" | "signin">("save");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const prefs = usePrefs();
  const [displayName, setDisplayName] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const userId = auth.user?.id ?? null;

  // "?saved=1" comes back from the confirmation email link. Read in an effect (not
  // searchParams) so the page stays prerendered.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("saved")) return;
    const t = window.setTimeout(() => setJustSaved(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  // Load profile (prefs + display name) for the current user.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getSupabase().then(async (sb) => {
      if (!sb || cancelled) return;
      const { data } = await sb
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled || !data) return;
      setDisplayName(data.display_name ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function savePrefs(patch: Prefs) {
    setSaveState("saving");
    setSaveState((await setPrefs(patch)) ? "saved" : "error");
  }

  async function saveName() {
    const sb = await getSupabase();
    if (!sb || !userId) return;
    setSaveState("saving");
    const { error } = await sb
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("id", userId);
    setSaveState(error ? "error" : "saved");
  }

  async function onDelete() {
    setDeleteError(null);
    try {
      const res = await deleteMyData();
      try {
        sessionStorage.removeItem("itapon-last-scan");
      } catch {
        /* ignore */
      }
      setDeleted(
        `Deleted ${res.scans} scan${res.scans === 1 ? "" : "s"}, ${res.feedback} feedback item${
          res.feedback === 1 ? "" : "s"
        } and ${res.photos} shared photo${res.photos === 1 ? "" : "s"}.`,
      );
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setConfirmDelete(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <div className="flex flex-col gap-6 md:max-w-2xl">
        <PageTitle title="Account" />
        <Card>
          Accounts aren&apos;t available right now. Scanning and the Bin Guide still work.
        </Card>
      </div>
    );
  }

  const guest = !auth.user || auth.isAnonymous;
  const pending = sentTo ?? auth.pendingEmail;

  return (
    <div className="flex flex-col gap-5 md:max-w-2xl">
      <PageTitle
        title="Account"
        subtitle={guest ? "You're using iTapon as a guest." : `Signed in as ${auth.user?.email}`}
      />

      {justSaved && !guest ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-card bg-bin-green-tint p-4 text-sm font-medium text-ink"
        >
          <CheckCircle2 aria-hidden className="size-5 text-[#1a7f37]" /> Your history is saved to
          your account.
        </p>
      ) : null}

      {guest ? (
        <Section title={mode === "save" ? "Save your history" : "Sign in"}>
          {pending ? (
            <p role="status" className="text-sm text-ink-2">
              <Mail aria-hidden className="mr-1.5 inline size-4 text-brand-strong" />
              We sent a link to <strong>{pending}</strong>. Open it on this device to finish.
              {mode === "save" ? " Your scans stay with you." : null}
            </p>
          ) : (
            <>
              <p className="text-sm text-ink-3">
                {mode === "save"
                  ? "Your scans are only stored for this browser. Add your email to keep them and see them on any device. No password needed."
                  : "Already saved your history on another device? We'll email you a sign-in link. Scans made here as a guest won't move over."}
              </p>
              <EmailForm mode={mode} onDone={setSentTo} />
              {GOOGLE_ENABLED ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    const r = await continueWithGoogle(mode === "save");
                    if (r.error) setSentTo(null);
                  }}
                >
                  Continue with Google
                </Button>
              ) : null}
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "save" ? "signin" : "save");
              setSentTo(null);
            }}
            className="self-start text-sm font-medium text-brand-strong underline"
          >
            {mode === "save"
              ? "Already have an account? Sign in"
              : "Save this device's history instead"}
          </button>
        </Section>
      ) : (
        <Section title="Profile">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-ink">Display name</span>
            <input
              value={displayName}
              maxLength={60}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => void saveName()}
              className={inputCls}
            />
          </label>
          <Button
            variant="outline"
            className="self-start"
            onClick={() => {
              void signOut();
            }}
          >
            <UserRound aria-hidden className="size-4" /> Sign out
          </Button>
        </Section>
      )}

      <Section title="Preferences">
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>
            <span className="block font-medium text-ink">Read results aloud automatically</span>
            <span className="block text-ink-3">Speaks the bin as soon as an item is found.</span>
          </span>
          <input
            type="checkbox"
            className="size-5 accent-brand-button"
            checked={Boolean(prefs.tts_auto)}
            onChange={(e) => void savePrefs({ tts_auto: e.target.checked })}
          />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span className="font-medium text-ink">Language</span>
          <select
            value={prefs.language ?? "en"}
            onChange={(e) => void savePrefs({ language: e.target.value as Prefs["language"] })}
            className="h-11 rounded-control border border-line bg-white px-3"
          >
            <option value="en">English</option>
            <option value="fil">Filipino</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span className="font-medium text-ink">Text size</span>
          <select
            value={prefs.text_size ?? "normal"}
            onChange={(e) => void savePrefs({ text_size: e.target.value as Prefs["text_size"] })}
            className="h-11 rounded-control border border-line bg-white px-3"
          >
            <option value="normal">Normal</option>
            <option value="large">Large</option>
          </select>
        </label>
        <p className="text-xs text-ink-3" role="status" aria-live="polite">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved."
              : saveState === "error"
                ? "Couldn't save. Check your connection."
                : ""}
        </p>
      </Section>

      <Section title="Your data">
        <p className="flex items-start gap-2 text-sm text-ink-3">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          iTapon stores which items you scanned and when. Camera images stay on your device unless
          you choose to share one.
        </p>
        {deleted ? (
          <p role="status" className="text-sm font-medium text-ink">
            {deleted}
          </p>
        ) : confirmDelete ? (
          <div className="flex flex-col gap-2 rounded-tile bg-bin-red-tint p-3">
            <p className="text-sm text-ink">
              Delete all your scans, feedback and shared photos? This can&apos;t be undone. See the{" "}
              <a href="/privacy" className="underline">
                privacy notice
              </a>{" "}
              for what is kept.
            </p>
            <div className="flex gap-2">
              <Button className="bg-[#c4282d] hover:bg-[#a51f24]" onClick={() => void onDelete()}>
                <Trash2 aria-hidden className="size-4" /> Yes, delete everything
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="self-start" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden className="size-4" /> Delete my data
          </Button>
        )}
        {deleteError ? (
          <p role="alert" className="text-sm text-[#c4282d]">
            {deleteError}
          </p>
        ) : null}
      </Section>
    </div>
  );
}
