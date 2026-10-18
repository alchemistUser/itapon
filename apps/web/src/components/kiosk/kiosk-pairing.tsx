// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// Phase 25: register a kiosk without email. The kiosk shows a code; an admin enters it on
// /admin → Kiosks → Register a kiosk. We poll until the device row appears.
import { KeyRound, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { requestPairingCode } from "@/lib/kiosk/hooks";

export function KioskPairing({ onPaired }: { onPaired: () => void }) {
  const [pairing, setPairing] = useState<{ code: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const onPairedRef = useRef(onPaired);
  useEffect(() => {
    onPairedRef.current = onPaired;
  }, [onPaired]);

  // While a code is shown: check every 5 s whether an admin used it, and count down.
  useEffect(() => {
    if (!pairing) return;
    const poll = window.setInterval(() => onPairedRef.current(), 5000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [pairing]);

  async function getCode() {
    setBusy(true);
    setError(null);
    const r = await requestPairingCode();
    setBusy(false);
    if ("error" in r) setError(r.error);
    else {
      setPairing(r);
      setNow(Date.now());
    }
  }

  const left = pairing ? Math.max(0, Math.round((pairing.expiresAt - now) / 1000)) : 0;
  const expired = pairing !== null && now > 0 && left === 0;

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-white p-4 text-center">
      <p className="text-sm font-semibold text-ink">Not registered as a kiosk yet</p>
      {pairing && !expired ? (
        <>
          <p className="text-sm text-ink-2">
            On another device, an admin opens <strong>/admin → Kiosks → Register a kiosk</strong>{" "}
            and enters:
          </p>
          <p
            className="font-mono text-4xl font-bold tracking-[0.3em] text-ink tabular-nums"
            aria-label={`Pairing code ${pairing.code.split("").join(" ")}`}
          >
            {pairing.code}
          </p>
          <p className="text-xs text-ink-3" aria-live="polite">
            Valid for {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}. This screen
            updates by itself once it&apos;s registered.
          </p>
        </>
      ) : (
        <p className="max-w-sm text-sm text-ink-2">
          Scans here are logged without a location. Get a pairing code, then an institution admin
          registers this kiosk with it. No email needed.
        </p>
      )}
      <Button
        variant={pairing && !expired ? "outline" : "primary"}
        onClick={getCode}
        disabled={busy}
      >
        {pairing ? (
          <RefreshCw aria-hidden className="size-4" />
        ) : (
          <KeyRound aria-hidden className="size-4" />
        )}
        {pairing ? "New code" : "Get pairing code"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-[#c4282d]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
