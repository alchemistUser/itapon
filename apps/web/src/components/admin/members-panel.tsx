// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Copy, Eye, EyeOff, RefreshCw, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { fetchMembership, removeMember, rotateJoinCode, type InstitutionMember } from "@/lib/admin";
import { setLeaderboardHidden } from "@/lib/progress";

/** "ABCD2345" → "ABCD-2345" for reading aloud or writing on a board. */
export const formatCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

/**
 * Members (ROADMAP-v2 Phase 31, D23): the institution's standing join code (share it with a
 * class; rotate it if it leaks) and its members, who admins can remove. Admins see a handle
 * or display name only, never emails or birth years.
 */
export function MembersPanel({ institutionId }: { institutionId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchMembership>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [removing, setRemoving] = useState<InstitutionMember | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    fetchMembership(institutionId)
      .then((d) => live && (setData(d), setError(null)))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [institutionId, version]);

  const reload = () => setVersion((v) => v + 1);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h2 className="text-base font-semibold text-ink">Members</h2>
      {error ? (
        <p role="alert" className="text-sm text-[#c4282d]">
          Couldn&apos;t load members: {error}
        </p>
      ) : !data ? (
        <Skeleton className="h-24" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-tile bg-surface p-3">
            <div className="flex-1">
              <p className="text-xs text-ink-3">Join code (members enter it under Account)</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-ink">
                {data.joinCode ? formatCode(data.joinCode) : "—"}
              </p>
            </div>
            {data.joinCode ? (
              <Button
                variant="outline"
                onClick={() =>
                  void navigator.clipboard
                    ?.writeText(data.joinCode!)
                    .then(() => setNote("Code copied."))
                    .catch(() => setNote("Copy failed; write it down instead."))
                }
              >
                <Copy aria-hidden className="size-4" /> Copy
              </Button>
            ) : null}
            {confirmRotate ? (
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      await rotateJoinCode();
                      setNote("New code made. The old code no longer works; current members stay.");
                    } catch (e) {
                      setNote((e as Error).message);
                    }
                    setConfirmRotate(false);
                    reload();
                  }}
                >
                  Yes, new code
                </Button>
                <Button variant="outline" onClick={() => setConfirmRotate(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirmRotate(true)}>
                <RefreshCw aria-hidden className="size-4" /> New code
              </Button>
            )}
          </div>
          {note ? (
            <p role="status" className="text-sm text-ink-2">
              {note}
            </p>
          ) : null}

          {data.members.length ? (
            <ul className="flex flex-col divide-y divide-line text-sm">
              {data.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium text-ink">{m.label}</span>
                    {m.joinedAt ? (
                      <span className="ml-2 text-xs text-ink-3">
                        joined {new Date(m.joinedAt).toLocaleDateString()}
                      </span>
                    ) : null}
                  </span>
                  {removing?.id === m.id ? (
                    <span className="flex gap-2">
                      <Button
                        className="bg-[#c4282d] hover:bg-[#a51f24]"
                        onClick={async () => {
                          try {
                            await removeMember(m.id);
                            setNote(`${m.label} was removed. Their own data stays with them.`);
                          } catch (e) {
                            setNote((e as Error).message);
                          }
                          setRemoving(null);
                          reload();
                        }}
                      >
                        Remove
                      </Button>
                      <Button variant="outline" onClick={() => setRemoving(null)}>
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <span className="flex gap-2">
                      <Button
                        variant="outline"
                        aria-label={`${m.hidden ? "Show" : "Hide"} ${m.label} on the leaderboard`}
                        aria-pressed={m.hidden}
                        onClick={async () => {
                          try {
                            await setLeaderboardHidden(m.id, !m.hidden);
                            setNote(
                              m.hidden
                                ? `${m.label} can appear on the leaderboard again.`
                                : `${m.label} is hidden from the leaderboard.`,
                            );
                          } catch (e) {
                            setNote((e as Error).message);
                          }
                          reload();
                        }}
                      >
                        {m.hidden ? (
                          <EyeOff aria-hidden className="size-4" />
                        ) : (
                          <Eye aria-hidden className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        aria-label={`Remove ${m.label}`}
                        onClick={() => setRemoving(m)}
                      >
                        <UserMinus aria-hidden className="size-4" />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">
              No members yet. Share the code: members enter it on their Account page.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
