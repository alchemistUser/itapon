// SPDX-License-Identifier: AGPL-3.0-or-later
// Admin panels for v2 (ROADMAP-v2 Phase 34): points insights, the "not found" search backlog,
// the knowledge test results, and the institution's own library notes and drop-off points.
"use client";

import { Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import {
  deleteCampusRow,
  fetchCampusContent,
  fetchKnowledgeTests,
  fetchPointsStats,
  fetchSearchMisses,
  knowledgeCsv,
  knowledgeSummary,
  returnRate,
  saveCampusDropoff,
  saveCampusNote,
  type CampusDropoff,
  type CampusNote,
  type KnowledgeRow,
  type PointsStats,
} from "@/lib/admin-v2";
import { cn } from "@/lib/cn";
import { groupsOf, subgroupsOf } from "@/lib/library/core";
import { useLibraryIndex } from "@/lib/library/client";

const inputCls =
  "h-10 w-full rounded-control border border-line bg-white px-3 text-sm text-ink focus:border-brand focus:outline-none";

function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-tile bg-surface p-3">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="text-2xl font-bold text-ink tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------- insights

export function InsightsPanel({ from, to }: { from: string; to: string }) {
  const [stats, setStats] = useState<PointsStats | null>(null);
  const [misses, setMisses] = useState<Awaited<ReturnType<typeof fetchSearchMisses>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchPointsStats(from, to), fetchSearchMisses(from, to)])
      .then(([s, m]) => {
        if (!live) return;
        setStats(s);
        setMisses(m);
        setError(null);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [from, to]);

  const rate = stats ? returnRate(stats) : null;
  const maxDaily = Math.max(1, ...(stats?.daily.map((d) => d.players) ?? [1]));
  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-base font-semibold text-ink">Missions and search insights</h2>
      {error ? (
        <p role="alert" className="text-sm text-[#c4282d]">
          Couldn&apos;t load insights: {error}
        </p>
      ) : !stats || !misses ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Active players" value={stats.players} hint="claimed a mission" />
            <Stat label="Points earned" value={stats.points} />
            <Stat
              label="Came back"
              value={rate === null ? "–" : `${Math.round(rate * 100)}%`}
              hint={`${stats.returningPlayers} of ${stats.previousPlayers} from the period before`}
            />
            <Stat label="Reversals" value={stats.reversals} />
          </div>

          {stats.daily.length ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Players per day</h3>
              <ul className="flex h-24 items-end gap-1" aria-label="Players per day">
                {stats.daily.map((d) => (
                  <li
                    key={d.day}
                    title={`${d.day}: ${d.players}`}
                    className="flex-1 rounded-t bg-brand"
                    style={{ height: `${(d.players / maxDaily) * 100}%` }}
                  >
                    <span className="sr-only">
                      {d.day}: {d.players} players
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-ink">Missions claimed</h3>
              {stats.byMission.length ? (
                <ul className="flex flex-col text-sm">
                  {stats.byMission.map((m) => (
                    <li key={m.code} className="flex justify-between border-b border-line py-1.5">
                      <span>{m.code.replace(/_/g, " ")}</span>
                      <span className="tabular-nums">
                        {m.awards} · {m.points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No missions claimed in this period.</p>
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Searches with no result</h3>
                {misses.length ? (
                  <button
                    type="button"
                    onClick={() =>
                      download(
                        `itapon-search-backlog-${to}.csv`,
                        [
                          "query,searches,last_seen",
                          ...misses.map(
                            (m) => `"${m.query.replace(/"/g, '""')}",${m.searches},${m.lastSeen}`,
                          ),
                        ].join("\n") + "\n",
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-strong underline"
                  >
                    <Download aria-hidden className="size-3.5" /> CSV
                  </button>
                ) : null}
              </div>
              {misses.length ? (
                <ul className="flex flex-col text-sm">
                  {misses.slice(0, 10).map((m) => (
                    <li key={m.query} className="flex justify-between border-b border-line py-1.5">
                      <span>“{m.query}”</span>
                      <span className="tabular-nums">{m.searches}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">Every search found something.</p>
              )}
              <p className="mt-1 text-xs text-ink-3">
                All users, no identity. The team uses this list to write new library entries.
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- evaluation

export function EvaluationPanel() {
  const [rows, setRows] = useState<KnowledgeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchKnowledgeTests()
      .then((r) => live && setRows(r))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  const s = rows ? knowledgeSummary(rows) : null;
  const fmt = (x: number | null) => (x === null ? "–" : x.toFixed(1));
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Knowledge test (pre/post)</h2>
        <Link href="/evaluate" className="text-sm font-semibold text-brand-strong underline">
          Run a test
        </Link>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[#c4282d]">
          {error}
        </p>
      ) : !s || !rows ? (
        <Skeleton className="h-20" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Tests" value={`${s.pre} pre · ${s.post} post`} />
            <Stat label="Both tests" value={s.paired} hint="participants" />
            <Stat
              label="Mean score"
              value={`${fmt(s.meanPre)} → ${fmt(s.meanPost)}`}
              hint="of 12"
            />
            <Stat
              label="Mean gain"
              value={
                s.meanGain === null ? "–" : `${s.meanGain >= 0 ? "+" : ""}${s.meanGain.toFixed(1)}`
              }
            />
          </div>
          {rows.length ? (
            <Button
              variant="outline"
              className="self-start"
              onClick={() => download("knowledge.csv", knowledgeCsv(rows))}
            >
              <Download aria-hidden className="size-4" /> knowledge.csv for pilot_report.py
            </Button>
          ) : null}
          <p className="text-xs text-ink-3">
            Tests taken on this institution&apos;s devices, under participant codes only.
          </p>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- campus notes & drop-offs

const DROPOFF_TYPES = [
  "ewaste",
  "hazdrop",
  "junkshop",
  "health",
  "takeback",
  "program",
  "compost",
  "donate",
  "repair",
];

export function CampusPanel({ institutionId }: { institutionId: string }) {
  const index = useLibraryIndex();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCampusContent>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  // new note form
  const [target, setTarget] = useState("");
  const [noteEn, setNoteEn] = useState("");
  const [noteFil, setNoteFil] = useState("");
  // new drop-off form
  const [dName, setDName] = useState("");
  const [dType, setDType] = useState(DROPOFF_TYPES[0]);
  const [dAddress, setDAddress] = useState("");
  const [dMap, setDMap] = useState("");
  const [dHours, setDHours] = useState("");

  useEffect(() => {
    let live = true;
    fetchCampusContent(institutionId)
      .then((d) => live && (setData(d), setError(null)))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [institutionId, version]);

  const targets = useMemo(() => {
    if (!index) return [];
    const mats = groupsOf(index.materials).flatMap((g) => [
      g,
      ...subgroupsOf(index.materials, g.code),
    ]);
    return [
      ...mats.map((m) => ({ value: `m:${m.code}`, label: `Material: ${m.name_en}` })),
      ...[...index.items]
        .sort((a, b) => a.name_en.localeCompare(b.name_en))
        .map((i) => ({ value: `i:${i.slug}`, label: `Item: ${i.name_en}` })),
    ];
  }, [index]);
  const targetLabel = (n: CampusNote) =>
    targets.find((t) => t.value === (n.itemSlug ? `i:${n.itemSlug}` : `m:${n.materialCode}`))
      ?.label ??
    n.itemSlug ??
    n.materialCode;

  async function run(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      setNote(ok);
      reload();
      return true;
    } catch (e) {
      setNote((e as Error).message);
      return false;
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    const [kind, code] = target.split(":");
    const ok = await run(
      () =>
        saveCampusNote(institutionId, {
          itemSlug: kind === "i" ? code : null,
          materialCode: kind === "m" ? code : null,
          noteEn,
          noteFil,
          status: "draft",
        }),
      "Note saved as a draft. Publish it to show it to members.",
    );
    if (ok) {
      setNoteEn("");
      setNoteFil("");
    }
  }

  async function addDropoff(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () =>
        saveCampusDropoff(institutionId, {
          name: dName,
          destination: dType,
          address: dAddress,
          mapUrl: dMap,
          hours: dHours,
          notes: null,
          status: "draft",
        }),
      "Drop-off point saved as a draft. Publish it to show it to members.",
    );
    if (ok) {
      setDName("");
      setDAddress("");
      setDMap("");
      setDHours("");
    }
  }

  const statusButton = (published: boolean, onToggle: () => void, label: string) => (
    <Button
      variant="outline"
      aria-label={`${published ? "Unpublish" : "Publish"} ${label}`}
      onClick={onToggle}
    >
      {published ? "Unpublish" : "Publish"}
    </Button>
  );

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-base font-semibold text-ink">Campus notes and drop-off points</h2>
      <p className="text-sm text-ink-3">
        Shown to your members on library pages, the scan card and the drop-off finder, labelled
        &quot;Your campus&quot;. Only add places you have checked.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-[#c4282d]">
          {error}
        </p>
      ) : !data ? (
        <Skeleton className="h-32" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="campus-notes" className="flex flex-col gap-3">
            <h3 id="campus-notes" className="text-sm font-semibold text-ink">
              Notes ({data.notes.length})
            </h3>
            <ul className="flex flex-col gap-2 text-sm">
              {data.notes.map((n) => (
                <li key={n.id} className="flex flex-col gap-1 rounded-tile bg-surface p-2.5">
                  <span className="text-xs text-ink-3">
                    {targetLabel(n)} ·{" "}
                    <span className={cn(n.status === "published" ? "text-[#1a7f37]" : "")}>
                      {n.status}
                    </span>
                  </span>
                  <span className="text-ink">{n.noteEn}</span>
                  <span className="flex gap-2">
                    {statusButton(
                      n.status === "published",
                      () =>
                        void run(
                          () =>
                            saveCampusNote(institutionId, {
                              ...n,
                              status: n.status === "published" ? "draft" : "published",
                            }),
                          "Saved.",
                        ),
                      "note",
                    )}
                    <Button
                      variant="outline"
                      aria-label="Delete note"
                      onClick={() =>
                        void run(() => deleteCampusRow("library_local_rules", n.id), "Deleted.")
                      }
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            <form onSubmit={addNote} className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">For</span>
                <select
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Choose an item or material…</option>
                  {targets.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">Note (English)</span>
                <textarea
                  required
                  maxLength={280}
                  value={noteEn}
                  onChange={(e) => setNoteEn(e.target.value)}
                  placeholder="e.g. Bring dead batteries to the library e-waste box, 2nd floor."
                  className={cn(inputCls, "h-20 py-2")}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">Note (Filipino, optional)</span>
                <textarea
                  maxLength={320}
                  value={noteFil}
                  onChange={(e) => setNoteFil(e.target.value)}
                  className={cn(inputCls, "h-20 py-2")}
                />
              </label>
              <Button
                type="submit"
                className="self-start"
                disabled={!target || noteEn.trim().length < 3}
              >
                Add note
              </Button>
            </form>
          </section>

          <section aria-labelledby="campus-dropoffs" className="flex flex-col gap-3">
            <h3 id="campus-dropoffs" className="text-sm font-semibold text-ink">
              Drop-off points ({data.dropoffs.length})
            </h3>
            <ul className="flex flex-col gap-2 text-sm">
              {data.dropoffs.map((d: CampusDropoff) => (
                <li key={d.id} className="flex flex-col gap-1 rounded-tile bg-surface p-2.5">
                  <span className="text-xs text-ink-3">
                    {d.destination} ·{" "}
                    <span className={cn(d.status === "published" ? "text-[#1a7f37]" : "")}>
                      {d.status}
                    </span>
                  </span>
                  <span className="font-medium text-ink">{d.name}</span>
                  {d.address ? <span className="text-ink-2">{d.address}</span> : null}
                  <span className="flex gap-2">
                    {statusButton(
                      d.status === "published",
                      () =>
                        void run(
                          () =>
                            saveCampusDropoff(institutionId, {
                              ...d,
                              status: d.status === "published" ? "draft" : "published",
                            }),
                          "Saved.",
                        ),
                      d.name,
                    )}
                    <Button
                      variant="outline"
                      aria-label={`Delete ${d.name}`}
                      onClick={() =>
                        void run(() => deleteCampusRow("library_dropoff_points", d.id), "Deleted.")
                      }
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            <form onSubmit={addDropoff} className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">Name</span>
                <input
                  required
                  maxLength={120}
                  value={dName}
                  onChange={(e) => setDName(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">Type</span>
                <select
                  value={dType}
                  onChange={(e) => setDType(e.target.value)}
                  className={inputCls}
                >
                  {DROPOFF_TYPES.map((t) => {
                    const d = index?.destinations.find((x) => x.code === t);
                    return (
                      <option key={t} value={t}>
                        {d?.name_en ?? t}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">Where (building, floor)</span>
                <input
                  maxLength={240}
                  value={dAddress}
                  onChange={(e) => setDAddress(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">Map link (https, optional)</span>
                <input
                  type="url"
                  pattern="https://.*"
                  value={dMap}
                  onChange={(e) => setDMap(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">Hours (optional)</span>
                <input
                  maxLength={120}
                  value={dHours}
                  onChange={(e) => setDHours(e.target.value)}
                  className={inputCls}
                />
              </label>
              <Button type="submit" className="self-start" disabled={dName.trim().length < 2}>
                Add drop-off point
              </Button>
            </form>
          </section>
        </div>
      )}
      {note ? (
        <p role="status" className="text-sm text-ink-2">
          {note}
        </p>
      ) : null}
    </Card>
  );
}
