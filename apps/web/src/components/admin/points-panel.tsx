// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Flag, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { fetchMemberPoints, fetchMembership, reversePoints, type MemberPoints } from "@/lib/admin";

/** Points per member, most first (pure; tested). */
export function pointsByMember(events: MemberPoints[]) {
  const totals = new Map<string, number>();
  for (const e of events) totals.set(e.userId, (totals.get(e.userId) ?? 0) + e.points);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Points (ROADMAP-v2 Phase 32): members' recent awards, scan-burst flags and reversals. An
 * admin reverses an award with a reason; the award stays in the ledger next to the reversal.
 */
export function PointsPanel({ institutionId }: { institutionId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMemberPoints>> | null>(null);
  const [names, setNames] = useState(new Map<string, string>());
  const [error, setError] = useState<string | null>(null);
  const [reversing, setReversing] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([fetchMemberPoints(), fetchMembership(institutionId)])
      .then(([d, m]) => {
        if (!live) return;
        setData(d);
        setNames(new Map(m.members.map((x) => [x.id, x.label])));
        setError(null);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [institutionId, version]);

  const label = (id: string) => names.get(id) ?? "Former member";
  const reversed = new Set(data?.events.filter((e) => e.reverses).map((e) => e.reverses));
  const awards = data?.events.filter((e) => e.kind === "award").slice(0, 20) ?? [];

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-base font-semibold text-ink">Points</h2>
      {error ? (
        <p role="alert" className="text-sm text-[#c4282d]">
          Couldn&apos;t load points: {error}
        </p>
      ) : !data ? (
        <Skeleton className="h-24" />
      ) : (
        <>
          {data.flags.length ? (
            <ul className="flex flex-col gap-1 rounded-tile bg-bin-red-tint p-3 text-sm">
              {data.flags.map((f) => (
                <li key={`${f.userId}-${f.day}`} className="flex items-center gap-2">
                  <Flag aria-hidden className="size-4 text-[#c4282d]" />
                  {label(f.userId)}: many scans in one minute on {f.day}. Scan missions were paused
                  that day.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">No flags.</p>
          )}

          <div>
            <h3 className="mb-1 text-sm font-semibold text-ink">Top members (recent)</h3>
            <ol className="flex flex-col gap-1 text-sm">
              {pointsByMember(data.events)
                .slice(0, 5)
                .map(([id, total]) => (
                  <li key={id} className="flex justify-between">
                    <span>{label(id)}</span>
                    <span className="font-semibold tabular-nums">{total}</span>
                  </li>
                ))}
            </ol>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-ink">Recent awards</h3>
            {awards.length ? (
              <ul className="flex flex-col divide-y divide-line text-sm">
                {awards.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {label(e.userId)} · {e.mission} ·{" "}
                      <span className="tabular-nums">+{e.points}</span>
                      <span className="ml-2 text-xs text-ink-3">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                    {reversed.has(e.id) ? (
                      <span className="text-xs text-ink-3">Reversed</span>
                    ) : reversing === e.id ? (
                      <form
                        className="flex gap-2"
                        onSubmit={async (ev) => {
                          ev.preventDefault();
                          try {
                            await reversePoints(e.id, reason);
                            setNote("Reversed.");
                          } catch (err) {
                            setNote((err as Error).message);
                          }
                          setReversing(null);
                          setReason("");
                          setVersion((v) => v + 1);
                        }}
                      >
                        <label>
                          <span className="sr-only">Reason</span>
                          <input
                            value={reason}
                            onChange={(ev) => setReason(ev.target.value)}
                            placeholder="Reason"
                            maxLength={200}
                            className="h-9 rounded-control border border-line px-2 text-sm"
                          />
                        </label>
                        <Button type="submit" disabled={reason.trim().length < 3}>
                          Reverse
                        </Button>
                      </form>
                    ) : (
                      <Button
                        variant="outline"
                        aria-label={`Reverse ${e.points} points of ${label(e.userId)}`}
                        onClick={() => setReversing(e.id)}
                      >
                        <Undo2 aria-hidden className="size-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">No points yet.</p>
            )}
          </div>
          {note ? (
            <p role="status" className="text-sm text-ink-2">
              {note}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
