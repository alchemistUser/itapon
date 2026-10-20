// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { pick } from "@/lib/library/core";
import { fetchCampusNotes, type CampusNoteView } from "@/lib/library/client";
import { usePrefs } from "@/lib/prefs";

/** "Your campus" notes from the member's own institution (Phase 34); nothing otherwise. */
export function CampusNotes({
  slug,
  material,
  compact = false,
}: {
  slug: string;
  material: string;
  compact?: boolean;
}) {
  const [notes, setNotes] = useState<CampusNoteView[]>([]);
  const lang = usePrefs().language ?? "en";
  useEffect(() => {
    let live = true;
    void fetchCampusNotes(slug, material).then((n) => live && setNotes(n));
    return () => {
      live = false;
    };
  }, [slug, material]);
  if (!notes.length) return null;
  return (
    <ul className={cn("flex flex-col gap-2", compact && "gap-1")}>
      {notes.map((n) => (
        <li
          key={n.noteEn}
          className={cn(
            "flex items-start gap-2 text-sm",
            !compact && "rounded-tile bg-brand-tint p-3 text-ink",
          )}
        >
          <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-strong" />
          <span>
            <span className="font-semibold">Your campus: </span>
            {pick(lang, n.noteEn, n.noteFil)}
          </span>
        </li>
      ))}
    </ul>
  );
}
