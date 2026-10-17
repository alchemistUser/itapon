// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { dismissInstall, promptInstall, useInstallMode } from "@/lib/install";

/** Home-screen install card (Phase 21): native prompt on Android, steps on iOS. */
export function InstallCard({ className }: { className?: string }) {
  const mode = useInstallMode();
  if (mode === "none") return null;
  return (
    <aside
      aria-label="Install iTapon"
      className={cn(
        "relative flex flex-col gap-3 rounded-card bg-card p-5 pr-12 shadow-card sm:flex-row sm:items-center",
        className,
      )}
    >
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={48}
        height={48}
        className="size-12 rounded-xl"
      />
      <div className="flex-1">
        <p className="font-semibold text-ink">Add iTapon to your home screen</p>
        {mode === "prompt" ? (
          <p className="text-sm text-ink-3">Opens like an app and works offline.</p>
        ) : (
          <p className="text-sm text-ink-3">
            In Safari, tap <Share aria-label="Share" className="inline size-4 align-text-bottom" />{" "}
            Share, then <SquarePlus aria-hidden className="inline size-4 align-text-bottom" />{" "}
            <span className="font-medium text-ink-2">Add to Home Screen</span>.
          </p>
        )}
      </div>
      {mode === "prompt" ? (
        <Button onClick={() => void promptInstall()} className="self-start sm:self-auto">
          <Download aria-hidden className="size-4" /> Install
        </Button>
      ) : null}
      <button
        type="button"
        onClick={dismissInstall}
        aria-label="Dismiss"
        className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-ink-3 hover:bg-surface"
      >
        <X aria-hidden className="size-4" />
      </button>
    </aside>
  );
}
