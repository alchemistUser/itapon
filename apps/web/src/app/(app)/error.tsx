// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { reportError } from "@/lib/monitoring";

// Phase 24: page-level crash screen inside the normal layout (nav stays usable).
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => reportError("react", error), [error]);
  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-card px-6 py-12 text-center shadow-card">
      <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="max-w-sm text-ink-3">
        The problem has been reported. Try again, or use the Bin Guide in the meantime.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>
          <RefreshCw aria-hidden className="size-4" /> Try again
        </Button>
        <ButtonLink href="/guide" variant="outline">
          Bin Guide
        </ButtonLink>
      </div>
    </div>
  );
}
