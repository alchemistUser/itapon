// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// Feedback review (Phase 20 task 4): approve the user's answer, relabel it, or reject it.
// Approved rows with a shared photo become training/field-test data via
// services/ml-api/scripts/export_feedback.py.
import { ImageOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BinTile } from "@/components/bins/bins";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { reviewFeedback, signedPhotoUrls } from "@/lib/admin";
import type { FeedbackRow } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { getItemLive, useItems } from "@/lib/content-store";

const TABS = ["pending", "approved", "rejected"] as const;
const NONE = "__none__";
const nameOf = (k: string | null) =>
  k ? (getItemLive(k)?.name ?? k) : "Something else / not trash";

function ReviewRow({
  row,
  photoUrl,
  onDone,
}: {
  row: FeedbackRow;
  photoUrl?: string;
  onDone: () => void;
}) {
  const items = useItems();
  const userAnswer = row.isCorrect ? row.predictedClassKey : row.correctedClassKey;
  const [label, setLabel] = useState<string>(
    (row.reviewStatus === "approved" ? row.reviewedClassKey : userAnswer) ?? NONE,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(status: FeedbackRow["reviewStatus"]) {
    setBusy(true);
    const r = await reviewFeedback(row.id, status, label === NONE ? null : label);
    setBusy(false);
    if (r.error) setError(r.error);
    else onDone();
  }

  return (
    <li className="grid gap-3 border-t border-line pt-3 first:border-0 first:pt-0 sm:grid-cols-[96px_1fr]">
      <div className="flex size-24 items-center justify-center overflow-hidden rounded-tile bg-surface">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img
            src={photoUrl}
            alt="Shared scan photo"
            crossOrigin="anonymous" // COEP: no CORP header on Storage, so load via CORS
            className="size-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[10px] text-ink-3">
            <ImageOff aria-hidden className="size-5" />
            {row.imagePath ? "Loading…" : "No photo"}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2 text-sm">
        <p className="text-ink-2">
          Model said{" "}
          <span className="inline-flex items-center gap-1 font-medium text-ink">
            <BinTile category={row.predictedCategory} size="sm" />
            {nameOf(row.predictedClassKey)}
          </span>
          {" · "}
          {row.isCorrect ? (
            <span className="font-medium text-ink">user: right</span>
          ) : (
            <>
              user: <span className="font-medium text-ink">{nameOf(row.correctedClassKey)}</span>
            </>
          )}
        </p>
        <p className="text-xs text-ink-3">
          {new Date(row.createdAt).toLocaleString()} · {row.modelVersion ?? "unknown model"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-ink-2">
            Label
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9 max-w-56 rounded-control border border-line bg-white px-2 text-sm text-ink"
            >
              <option value={NONE}>Something else / not trash</option>
              {items.map((i) => (
                <option key={i.classKey} value={i.classKey}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" disabled={busy} onClick={() => act("approved")}>
            {row.reviewStatus === "approved" ? "Save label" : "Approve"}
          </Button>
          {row.reviewStatus !== "rejected" ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("rejected")}>
              Reject
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("pending")}>
              Back to pending
            </Button>
          )}
        </div>
        {error ? (
          <p role="alert" className="text-xs text-[#c4282d]">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function ReviewQueue({ rows, onChange }: { rows: FeedbackRow[]; onChange: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const shown = useMemo(() => rows.filter((r) => r.reviewStatus === tab).slice(0, 50), [rows, tab]);
  const pathsKey = shown
    .map((r) => r.imagePath)
    .filter(Boolean)
    .join("|");

  useEffect(() => {
    if (!pathsKey) return;
    let cancelled = false;
    signedPhotoUrls(pathsKey.split("|")).then((urls) => {
      if (!cancelled) setPhotos((p) => ({ ...p, ...urls }));
    });
    return () => {
      cancelled = true;
    };
  }, [pathsKey]);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Feedback review</h2>
        <div role="tablist" aria-label="Review status" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "min-h-9 rounded-control px-3 text-xs font-medium capitalize",
                tab === t ? "bg-ink text-white" : "text-ink-2 hover:bg-surface",
              )}
            >
              {t} · {rows.filter((r) => r.reviewStatus === t).length}
            </button>
          ))}
        </div>
      </div>
      {shown.length ? (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <ReviewRow
              key={`${r.id}-${r.reviewStatus}`}
              row={r}
              photoUrl={r.imagePath ? photos[r.imagePath] : undefined}
              onDone={onChange}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">Nothing {tab} in this period.</p>
      )}
      <p className="text-xs text-ink-3">
        Only answers from this institution&apos;s kiosks and members are shown. Approved answers
        with a photo feed the next model evaluation (see the retraining runbook).
      </p>
    </Card>
  );
}
