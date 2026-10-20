// SPDX-License-Identifier: AGPL-3.0-or-later
// Knowledge test for the evaluation (ROADMAP-v2 Phase 34): the same 12 "which bin?" questions
// before (pre) and after (post) the pilot, under a participant code. Scored on the server;
// no right answers are shown, so the pre-test doesn't teach.
"use client";

import { ClipboardCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { BinTile } from "@/components/bins/bins";
import { Button } from "@/components/ui/button";
import { Card, PageTitle, Skeleton } from "@/components/ui/primitives";
import { friendlyError } from "@/lib/accounts";
import { BIN_ORDER, BINS } from "@/lib/bins";
import { cn } from "@/lib/cn";
import type { Category } from "@/lib/detector/types";
import { useAuth } from "@/lib/supabase/auth";
import { ensureUserId, getSupabase, supabaseConfigured } from "@/lib/supabase/client";

interface Item {
  n: number;
  slug: string;
  nameEn: string;
  nameFil: string;
}

export const CODE_RE = /^P[0-9]{2,3}$/;

export function KnowledgeTest() {
  const auth = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [code, setCode] = useState("");
  const [form, setForm] = useState<"pre" | "post">("pre");
  const [answers, setAnswers] = useState<Record<string, Category>>({});
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fil, setFil] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let live = true;
    void getSupabase().then(async (sb) => {
      if (!sb) return;
      const { data, error: e } = await sb.rpc("knowledge_test_items");
      if (!live) return;
      if (e) setError(friendlyError(e));
      else
        setItems(
          (data ?? []).map((r) => ({
            n: r.n,
            slug: r.slug,
            nameEn: r.name_en,
            nameFil: r.name_fil,
          })),
        );
    });
    return () => {
      live = false;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!(await ensureUserId()))
        throw new Error("Couldn't start a session. Check your connection.");
      const sb = await getSupabase();
      const { data, error: err } = await sb!.rpc("submit_knowledge_test", {
        p_code: code,
        p_form: form,
        p_answers: answers,
      });
      if (err) throw new Error(err.code === "23505" ? err.message : friendlyError(err));
      setResult(data);
    } catch (x) {
      setError((x as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setCode("");
    setAnswers({});
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0 });
  }

  if (!supabaseConfigured) {
    return (
      <div className="flex flex-col gap-6 md:max-w-3xl">
        <PageTitle title="Knowledge test" />
        <Card>The test isn&apos;t available right now.</Card>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const total = items?.length ?? 12;
  const ready = CODE_RE.test(code) && answered === total;

  return (
    <div className="flex flex-col gap-6 md:max-w-3xl">
      <PageTitle title="Knowledge test" subtitle="12 questions · about 3 minutes" />
      {auth.isAnonymous ? (
        <p className="rounded-tile bg-surface p-3 text-sm text-ink-2">
          Facilitator: sign in with your institution&apos;s admin account on this device first, so
          results appear on your dashboard.
        </p>
      ) : null}

      {result !== null ? (
        <Card className="flex flex-col items-start gap-3 p-5" role="status">
          <ClipboardCheck aria-hidden className="size-8 text-brand-strong" />
          <p className="text-lg font-semibold text-ink">
            Thank you! {code} scored {result} of {total}.
          </p>
          <Button onClick={next}>Next participant</Button>
        </Card>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink">Participant code</span>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
                placeholder="P07"
                pattern="P[0-9]{2,3}"
                autoComplete="off"
                aria-describedby="code-help"
                className="h-11 rounded-control border border-line bg-white px-3 font-mono"
              />
              <span id="code-help" className="text-xs text-ink-3">
                From the task sheet. Never a name.
              </span>
            </label>
            <fieldset className="flex flex-col gap-1 text-sm">
              <legend className="font-medium text-ink">Test</legend>
              <div className="flex gap-2 pt-1">
                {(["pre", "post"] as const).map((f) => (
                  <label
                    key={f}
                    className={cn(
                      "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-control border text-sm font-semibold",
                      form === f
                        ? "border-brand bg-brand-tint text-brand-strong"
                        : "border-line bg-white text-ink-2",
                    )}
                  >
                    <input
                      type="radio"
                      name="form"
                      value={f}
                      checked={form === f}
                      onChange={() => setForm(f)}
                      className="sr-only"
                    />
                    {f === "pre" ? "Before (pre)" : "After (post)"}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={fil}
                onChange={(e) => setFil(e.target.checked)}
                className="size-4"
              />
              Show item names in Filipino
            </label>
          </Card>

          {items ? (
            <ol className="flex flex-col gap-4">
              {items.map((it) => (
                <li key={it.slug}>
                  <fieldset className="flex flex-col gap-2 rounded-card bg-card p-4 shadow-card">
                    <legend className="sr-only">Question {it.n}</legend>
                    <p className="text-sm font-medium text-ink">
                      {it.n}. Which bin does <strong>{fil ? it.nameFil : it.nameEn}</strong> go in?
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {BIN_ORDER.map((b) => (
                        <label
                          key={b}
                          className={cn(
                            "flex min-h-12 cursor-pointer items-center gap-2 rounded-tile border p-2 text-sm",
                            answers[it.slug] === b
                              ? "border-brand bg-brand-tint font-semibold"
                              : "border-line bg-white",
                          )}
                        >
                          <input
                            type="radio"
                            name={it.slug}
                            value={b}
                            checked={answers[it.slug] === b}
                            onChange={() => setAnswers((a) => ({ ...a, [it.slug]: b }))}
                            className="sr-only"
                          />
                          <BinTile category={b} size="sm" />
                          {BINS[b].binLabel}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ol>
          ) : (
            <Skeleton className="h-64" />
          )}

          {error ? (
            <p role="alert" className="text-sm text-[#c4282d]">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="self-start" disabled={!ready || busy}>
            {busy ? "Saving…" : `Submit (${answered}/${total})`}
          </Button>
        </form>
      )}
    </div>
  );
}
