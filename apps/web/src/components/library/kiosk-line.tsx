// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { candidatesFor, itemPath, topIdea, VALUE_LINE, whereElse } from "@/lib/library/core";
import { loadLibraryIndex, loadLibraryItem, logLibraryEvent } from "@/lib/library/client";

export interface KioskLine {
  slug: string;
  text: string;
}

/** One short spoken line for the kiosk: who buys it, a reuse idea, or where else it goes. */
export function lineFor(
  item: Awaited<ReturnType<typeof loadLibraryItem>>,
  dests: Parameters<typeof whereElse>[1],
): string | null {
  if (!item) return null;
  if (item.value && VALUE_LINE[item.value]) return VALUE_LINE[item.value];
  const idea = topIdea(item);
  if (idea) return `Idea: ${idea.text}.`;
  const others = whereElse(item, dests);
  return others.length
    ? `You can also bring it to: ${others.map((d) => d.name_en).join(", ")}.`
    : null;
}

/**
 * Kiosk (Phase 30): preloads the library line for every scanner class once, so it can be
 * read aloud right after the bin with no wait. Returns a lookup by class key.
 */
export function useKioskLines(): (classKey: string) => KioskLine | null {
  const lines = useRef(new Map<string, KioskLine>());
  useEffect(() => {
    let live = true;
    void (async () => {
      const index = await loadLibraryIndex();
      if (!index) return;
      const keys = new Set(index.items.map((i) => i.detectable_class_key).filter((k) => !!k));
      for (const key of keys) {
        const main = candidatesFor(index.items, key!)[0];
        const item = main ? await loadLibraryItem(main.slug) : null;
        const text = lineFor(item, index.destinations);
        if (live && item && text) lines.current.set(key!, { slug: item.slug, text });
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  return useCallback((classKey: string) => lines.current.get(classKey) ?? null, []);
}

/** The line on screen with a QR code to the full entry (scan it with a phone). */
export function KioskLibraryLine({ line }: { line: KioskLine | null }) {
  const [svg, setSvg] = useState<{ slug: string; svg: string } | null>(null);
  useEffect(() => {
    if (!line) return;
    let live = true;
    const url = new URL(itemPath(line.slug), window.location.origin).href;
    void import("qrcode").then((QR) =>
      QR.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 }).then(
        (s) => live && setSvg({ slug: line.slug, svg: s }),
      ),
    );
    logLibraryEvent(line.slug, "view", "kiosk");
    return () => {
      live = false;
    };
  }, [line]);
  if (!line) return null;
  return (
    <div className="mt-4 flex items-center gap-4 rounded-tile bg-surface p-4">
      <p className="flex-1 text-lg text-ink">{line.text}</p>
      {svg?.slug === line.slug ? (
        <figure className="flex shrink-0 flex-col items-center gap-1">
          <span
            role="img"
            aria-label="QR code to the full guide for this item"
            className="block size-24 bg-white [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: svg.svg }}
          />
          <figcaption className="text-xs text-ink-3">Scan for more</figcaption>
        </figure>
      ) : null}
    </div>
  );
}
