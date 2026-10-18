// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// Phase 25: printable A4 QR poster for pilot locations. Fill in the place, check the
// preview, print (or "Save as PDF"). The controls are hidden when printing.
import { Printer } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { BinTile } from "@/components/bins/bins";
import { Button } from "@/components/ui/button";
import { BIN_ORDER, BINS } from "@/lib/bins";

const SITE = "https://itapon.vercel.app";

export function Poster() {
  const [place, setPlace] = useState("TIP Quezon City · Canteen");
  const [url, setUrl] = useState(`${SITE}/scan`);
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 }).then(
      (s) => !cancelled && setSvg(s),
      () => !cancelled && setSvg(""),
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="min-h-dvh bg-surface print:bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-end gap-3 p-4 print:hidden">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Location line</span>
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="h-10 rounded-control border border-line bg-white px-3"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-ink">QR link</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-10 rounded-control border border-line bg-white px-3"
          />
        </label>
        <Button onClick={() => window.print()}>
          <Printer aria-hidden className="size-4" /> Print
        </Button>
      </div>

      {/* A4 portrait page */}
      <article className="mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col items-center justify-between bg-white p-[12mm] text-center text-ink shadow-card print:shadow-none">
        <header className="flex flex-col items-center gap-2">
          <p className="text-[18pt] font-semibold text-bin-blue">iTapon</p>
          <h1 className="text-[40pt] leading-tight font-bold tracking-tight">
            Saan itatapon?
            <br />
            <span className="text-bin-blue">Scan it. Sort it right.</span>
          </h1>
          <p className="max-w-[150mm] text-[14pt] text-ink-2">
            Point your phone at your trash and iTapon tells you which bin it goes in, with a
            read-aloud option.
          </p>
        </header>

        <div className="flex flex-col items-center gap-2">
          <div
            className="size-[95mm] [&>svg]:size-full"
            role="img"
            aria-label={`QR code for ${url}`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="font-mono text-[13pt] text-ink-2">{url.replace(/^https?:\/\//, "")}</p>
          <p className="text-[11pt] text-ink-3">
            Free · no sign-up · works offline after the first visit
          </p>
        </div>

        <ul className="grid w-full grid-cols-4 gap-[4mm]">
          {BIN_ORDER.map((c) => (
            <li key={c} className="flex flex-col items-center gap-1">
              <BinTile category={c} size="lg" />
              <span className="text-[11pt] font-semibold">{BINS[c].binLabel}</span>
              <span className="text-[9pt] text-ink-3">{BINS[c].name}</span>
            </li>
          ))}
        </ul>

        <footer className="flex w-full items-end justify-between text-[9pt] text-ink-3">
          <span>{place}</span>
          <span>Pilot study · CS 406, TIP QC · Privacy: itapon.vercel.app/privacy</span>
        </footer>
      </article>
    </div>
  );
}
