// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata } from "next";

import { BinTile } from "@/components/bins/bins";
import { PageTitle } from "@/components/ui/primitives";
import { BINS } from "@/lib/bins";
import { MOCK_HISTORY } from "@/lib/mock";

export const metadata: Metadata = { title: "History" };

// S4 History. Static mock; Phase 16 reads the user's scan_sessions from Supabase.
export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-6 md:max-w-2xl">
      <PageTitle title="History" />
      {MOCK_HISTORY.map((group) => (
        <section key={group.day} aria-labelledby={`h-${group.day}`} className="flex flex-col gap-3">
          <h2 id={`h-${group.day}`} className="text-lg font-semibold text-ink">
            {group.day}
          </h2>
          <ul className="flex flex-col gap-3">
            {group.entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-card bg-card p-3 shadow-card"
              >
                <BinTile category={e.category} size="sm" className="size-10 rounded-full" />
                <div>
                  <p className="font-semibold text-ink">{e.name}</p>
                  <p className="text-xs text-ink-3">
                    {e.time} · <span className="sr-only">Bin: </span>
                    {BINS[e.category].binLabel}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
