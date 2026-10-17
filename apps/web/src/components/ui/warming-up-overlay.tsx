// SPDX-License-Identifier: AGPL-3.0-or-later
import { Recycle } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Loading screen shown while the in-browser model downloads / initialises (D3, D12).
 * Presentational only; Phase 12 wires it to BrowserDetector progress, retry and fallbacks.
 */
export function WarmingUpOverlay({
  loadedMB,
  totalMB,
  slow = false,
  className,
}: {
  loadedMB?: number;
  totalMB?: number;
  slow?: boolean;
  className?: string;
}) {
  const pct =
    loadedMB !== undefined && totalMB
      ? Math.min(100, Math.round((loadedMB / totalMB) * 100))
      : null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4 bg-ink/85 px-6 text-center text-white",
        className,
      )}
    >
      <Recycle aria-hidden className="size-12 animate-spin [animation-duration:2.5s]" />
      <p className="text-lg font-semibold">Warming up the scanner…</p>
      {pct !== null ? (
        <div className="w-full max-w-64">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-bin-blue" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-white/80">
            Downloading scanner · {loadedMB?.toFixed(1)} of {totalMB?.toFixed(0)} MB
          </p>
        </div>
      ) : (
        <p className="text-sm text-white/80">Getting ready…</p>
      )}
      {slow ? (
        <p className="max-w-64 text-sm text-white/80">
          This can take up to a minute the first time.
        </p>
      ) : null}
    </div>
  );
}
