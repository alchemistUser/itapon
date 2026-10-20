// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { loadLibraryIndex, loadLibraryItem } from "@/lib/library/client";
import type { LibraryIndex, LibraryItem } from "@/lib/library/types";

import { ItemEntry } from "./item-entry";

/**
 * Offline fallback for /library/item/<slug> (Phase 30). The service worker serves this page
 * when an item page was never visited online; it renders the entry from the cached library
 * files instead, so the whole library works in airplane mode.
 */
export function OfflineItem() {
  const [state, setState] = useState<
    { item: LibraryItem; index: LibraryIndex } | "loading" | "missing"
  >("loading");

  useEffect(() => {
    const slug = window.location.pathname.match(/^\/library\/item\/([^/]+)/)?.[1];
    if (!slug) {
      const t = setTimeout(() => setState("missing"));
      return () => clearTimeout(t);
    }
    let live = true;
    void Promise.all([loadLibraryItem(decodeURIComponent(slug)), loadLibraryIndex()]).then(
      ([item, index]) => live && setState(item && index ? { item, index } : "missing"),
    );
    return () => {
      live = false;
    };
  }, []);

  if (state === "loading") return <Skeleton className="h-64" />;
  if (state === "missing") {
    return (
      <EmptyState icon={<WifiOff aria-hidden className="size-8" />} title="Not available offline">
        <p>Open this page once while online to keep it for offline use.</p>
        <ButtonLink href="/library" variant="outline" className="mt-3">
          Back to the library
        </ButtonLink>
      </EmptyState>
    );
  }
  return <ItemEntry item={state.item} ctx={state.index} />;
}
