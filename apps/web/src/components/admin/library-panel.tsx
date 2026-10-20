// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { fetchLibraryCounts, type LibraryCount } from "@/lib/admin";
import { itemPath } from "@/lib/library/core";
import { loadLibraryIndex } from "@/lib/library/client";

interface Row {
  slug: string;
  name: string;
  view: number;
  chooser: number;
  idea_plan: number;
  idea_done: number;
}

/** Totals per item, most viewed first (pure; tested). */
export function libraryRows(
  counts: LibraryCount[],
  scope: "institution" | "everyone",
  names: Map<string, string>,
): Row[] {
  const rows = new Map<string, Row>();
  for (const c of counts) {
    const r = rows.get(c.slug) ?? {
      slug: c.slug,
      name: names.get(c.slug) ?? c.slug,
      view: 0,
      chooser: 0,
      idea_plan: 0,
      idea_done: 0,
    };
    r[c.event] += c[scope];
    rows.set(c.slug, r);
  }
  return [...rows.values()]
    .filter((r) => r.view + r.chooser + r.idea_plan + r.idea_done > 0)
    .sort((a, b) => b.view - a.view || b.idea_done - a.idea_done || a.name.localeCompare(b.name));
}

/** Admin dashboard (Phase 30): which library entries people read and act on. */
export function LibraryPanel({ from, to }: { from: string; to: string }) {
  const [counts, setCounts] = useState<LibraryCount[] | null>(null);
  const [names, setNames] = useState(new Map<string, string>());
  const [scope, setScope] = useState<"institution" | "everyone">("institution");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchLibraryCounts(from, to), loadLibraryIndex()])
      .then(([c, index]) => {
        if (!live) return;
        setCounts(c);
        setNames(new Map((index?.items ?? []).map((i) => [i.slug, i.name_en])));
        setError(null);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [from, to]);

  const rows = counts ? libraryRows(counts, scope, names).slice(0, 15) : [];
  const total = (k: keyof Omit<Row, "slug" | "name">) =>
    counts ? libraryRows(counts, scope, names).reduce((n, r) => n + r[k], 0) : 0;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Disposal library</h2>
        <div role="group" aria-label="Whose use" className="flex gap-1 text-xs">
          {(["institution", "everyone"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className={cn(
                "min-h-8 rounded-full px-3 font-semibold",
                scope === s ? "bg-brand-tint text-brand-strong" : "text-ink-3 hover:text-ink",
              )}
            >
              {s === "institution" ? "Your institution" : "All users"}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="text-sm text-[#c4282d]">Couldn&apos;t load library use: {error}</p>
      ) : !counts ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["view", "Entries viewed"],
                ["chooser", "“Which one?” used"],
                ["idea_plan", "“I'll do this”"],
                ["idea_done", "“Done it”"],
              ] as const
            ).map(([k, label]) => (
              <div key={k} className="rounded-tile bg-surface p-3">
                <dt className="text-xs text-ink-3">{label}</dt>
                <dd className="text-2xl font-bold text-ink tabular-nums">{total(k)}</dd>
              </div>
            ))}
          </dl>
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-ink-3">
                  <tr>
                    <th scope="col" className="py-2 font-medium">
                      Item
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Views
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Which one?
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      I&apos;ll do this
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Done
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {rows.map((r) => (
                    <tr key={r.slug} className="border-t border-line">
                      <td className="py-2">
                        <Link href={itemPath(r.slug)} className="text-ink underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right">{r.view}</td>
                      <td className="py-2 text-right">{r.chooser}</td>
                      <td className="py-2 text-right">{r.idea_plan}</td>
                      <td className="py-2 text-right">{r.idea_done}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-3">No library use in this period yet.</p>
          )}
          <p className="text-xs text-ink-3">
            Counts only: no account, device or scan is linked to them.
          </p>
        </>
      )}
    </Card>
  );
}
