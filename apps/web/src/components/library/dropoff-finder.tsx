// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Clock, ExternalLink, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { LGU_NAMES } from "@/lib/library/core";
import { useLibraryIndex } from "@/lib/library/client";
import type { DropoffPoint } from "@/lib/library/types";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";

/** Destination types people look for, with what to do when no point is listed yet. */
export const DROPOFF_TYPES: { code: string; label: string; howTo: string }[] = [
  {
    code: "ewaste",
    label: "E-waste",
    howTo:
      "Ask your barangay or city environment office about e-waste collection, or ask the store where you bought it about take-back.",
  },
  {
    code: "hazdrop",
    label: "Hazardous waste",
    howTo:
      "Batteries, chemicals and broken lamps are special waste. Keep them sealed and ask your barangay about the next hazardous waste collection.",
  },
  {
    code: "junkshop",
    label: "Junk shops",
    howTo: "Most barangays have a junk shop that buys clean bottles, cans, cardboard and scrap.",
  },
  {
    code: "health",
    label: "Health centre",
    howTo: "For needles and old medicine, ask your barangay health centre or a pharmacy.",
  },
  {
    code: "takeback",
    label: "Take-back",
    howTo: "Some stores and brands take back their own products. Ask where you bought it.",
  },
  {
    code: "program",
    label: "City programmes",
    howTo:
      "Quezon City runs programmes like Trash to Cashback. Check the city's announcements for booth schedules.",
  },
];

interface Point extends DropoffPoint {
  campus: boolean;
}

/** Your institution's own drop-off points (RLS: members see their institution's only). */
async function campusPoints(): Promise<Point[]> {
  if (!supabaseConfigured) return [];
  const sb = await getSupabase();
  if (!sb) return [];
  const { data: session } = await sb.auth.getSession();
  if (!session.session) return []; // never create an account just to look
  const { data } = await sb
    .from("library_dropoff_points")
    .select("name, destination_code, address, map_url, hours, lgu, notes, institution_id")
    .not("institution_id", "is", null)
    .eq("status", "published");
  return (data ?? []).map((r) => ({
    name: r.name,
    destination: r.destination_code,
    address: r.address,
    map_url: r.map_url,
    hours: r.hours,
    lgu: r.lgu,
    notes: r.notes,
    draft: false,
    campus: true,
  }));
}

/** Drop-off finder (Phase 30): filter by type; campus points first, then city ones. */
export function DropoffFinder({ initialType }: { initialType?: string }) {
  const index = useLibraryIndex();
  const [type, setType] = useState(
    DROPOFF_TYPES.some((t) => t.code === initialType) ? initialType! : DROPOFF_TYPES[0].code,
  );
  const [campus, setCampus] = useState<Point[]>([]);
  useEffect(() => {
    let live = true;
    void campusPoints().then((p) => live && setCampus(p));
    return () => {
      live = false;
    };
  }, []);

  const meta = DROPOFF_TYPES.find((t) => t.code === type)!;
  const points: Point[] = [
    ...campus,
    ...(index?.dropoffs ?? []).map((p) => ({ ...p, campus: false })),
  ].filter((p) => p.destination === type);

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Type" className="flex flex-wrap gap-2">
        {DROPOFF_TYPES.map((t) => (
          <button
            key={t.code}
            type="button"
            aria-pressed={type === t.code}
            onClick={() => {
              setType(t.code);
              history.replaceState(null, "", `?type=${t.code}`);
            }}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm font-semibold",
              type === t.code
                ? "border-transparent bg-brand-button text-white"
                : "border-line bg-white text-ink-2 hover:bg-surface",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {index === undefined ? (
        <Skeleton className="h-24" />
      ) : points.length ? (
        <ul className="flex flex-col gap-3" aria-label={`${meta.label} drop-off points`}>
          {points.map((p) => (
            <li key={`${p.name}-${p.address}`} className="rounded-card bg-card p-4 shadow-card">
              <p className="font-semibold text-ink">
                {p.name}
                <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-2">
                  {p.campus ? "Your campus" : p.lgu ? (LGU_NAMES[p.lgu] ?? p.lgu) : "City"}
                  {p.draft ? " · draft" : ""}
                </span>
              </p>
              {p.address ? (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-2">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" /> {p.address}
                </p>
              ) : null}
              {p.hours ? (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-3">
                  <Clock aria-hidden className="mt-0.5 size-4 shrink-0" /> {p.hours}
                </p>
              ) : null}
              {p.notes ? <p className="mt-1 text-sm text-ink-3">{p.notes}</p> : null}
              {p.map_url ? (
                <a
                  href={p.map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand-strong underline"
                >
                  Open in maps <ExternalLink aria-hidden className="size-3.5" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-card bg-card p-4 shadow-card">
          <p className="font-semibold text-ink">No verified {meta.label.toLowerCase()} points yet</p>
          <p className="mt-1 text-sm text-ink-3">{meta.howTo}</p>
        </div>
      )}
      <p className="text-xs text-ink-3">
        We only list places the team has checked. Call ahead: hours and accepted items change.
      </p>
    </div>
  );
}
