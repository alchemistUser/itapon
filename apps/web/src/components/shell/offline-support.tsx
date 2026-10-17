// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// Phase 21: registers the service worker (production only), asks it to pre-cache the pages
// that must work offline once per deploy, and sends queued scan logs when back online.
import { useEffect } from "react";

import "@/lib/install"; // starts listening for beforeinstallprompt on every page
import { BIN_ORDER } from "@/lib/bins";
import { DETECTABLE_KEYS } from "@/lib/content";
import { flushScanLogs } from "@/lib/scan/log-scan";

const OFFLINE_PAGES = [
  "/",
  "/offline",
  "/guide",
  ...BIN_ORDER.map((c) => `/guide/${c}`),
  "/scan",
  "/scan/plan",
  ...DETECTABLE_KEYS.map((k) => `/scan/result/${k}`),
  "/history",
  "/account",
  "/kiosk",
];

export function OfflineSupport() {
  useEffect(() => {
    void flushScanLogs();
    const onOnline = () => void flushScanLogs();
    window.addEventListener("online", onOnline);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => navigator.serviceWorker.ready)
        .then((reg) =>
          reg.active?.postMessage({
            type: "warm",
            build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev",
            urls: OFFLINE_PAGES,
          }),
        )
        .catch((e) => console.warn("[itapon] Service worker unavailable.", e));
    }
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}
