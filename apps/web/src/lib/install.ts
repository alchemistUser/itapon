// SPDX-License-Identifier: AGPL-3.0-or-later
// "Add to Home Screen" (Phase 21). Chromium fires beforeinstallprompt (possibly before any
// React component mounts, so we listen from module load); iOS Safari has no prompt, so we
// show the Share → Add to Home Screen steps instead.
"use client";

import { useSyncExternalStore } from "react";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallMode = "none" | "prompt" | "ios";

const DISMISSED = "itapon-install-dismissed";
let deferred: InstallEvent | null = null;
let dismissed = false;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  try {
    dismissed = localStorage.getItem(DISMISSED) === "1";
  } catch {
    /* storage blocked */
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // show our own card instead of the mini-infobar
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

function standalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function snapshot(): InstallMode {
  if (dismissed || installed || standalone()) return "none";
  if (deferred) return "prompt";
  return isIosSafari() ? "ios" : "none";
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    () => "none",
  );
}

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice.catch(() => null);
  deferred = null;
  emit();
}

export function dismissInstall() {
  dismissed = true;
  try {
    localStorage.setItem(DISMISSED, "1");
  } catch {
    /* storage blocked */
  }
  emit();
}
