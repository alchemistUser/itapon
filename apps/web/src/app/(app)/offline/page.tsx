// SPDX-License-Identifier: AGPL-3.0-or-later
import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

// Served by the service worker (Phase 21) when a page that was never cached is opened offline.
export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-card px-6 py-12 text-center shadow-card">
      <WifiOff aria-hidden className="size-10 text-ink-3" />
      <h1 className="text-2xl font-bold text-ink">You&apos;re offline</h1>
      <p className="max-w-sm text-ink-3">
        This page isn&apos;t saved on your device yet. The Bin Guide and the scanner work offline
        after your first visit.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <ButtonLink href="/guide">Browse the Bin Guide</ButtonLink>
        <ButtonLink href="/scan" variant="outline">
          Open the scanner
        </ButtonLink>
      </div>
    </div>
  );
}
