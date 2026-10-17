// SPDX-License-Identifier: AGPL-3.0-or-later
// Production error reporting (Phase 24). First-party and minimal: error text, page path,
// build id and a coarse browser label go to the insert-only `client_errors` table. No user
// id, no query strings (they can carry signed URLs or tokens), at most a few per page load.

import { normalizeSupabaseUrl } from "@/lib/supabase/client";

export type ErrorKind = "error" | "unhandledrejection" | "detector" | "react";

const MAX_PER_PAGE = 5;
const sent = new Set<string>();

/** Removes query strings and fragments from any URL in the text (pure; tested). */
export function scrub(text: string, max: number): string {
  return text
    .replace(/(https?:\/\/[^\s?#"')]+)[?#][^\s"')]*/g, "$1")
    .replace(/\b(eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,})\b/g, "[jwt]")
    .slice(0, max);
}

/** "Chrome 141 / Android"-style label, never the full user agent (pure; tested). */
export function browserLabel(ua: string): string {
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "other";
  const m =
    ua.match(/(Edg|EdgiOS)\/(\d+)/) ??
    ua.match(/(CriOS|Chrome)\/(\d+)/) ??
    ua.match(/(FxiOS|Firefox)\/(\d+)/) ??
    ua.match(/Version\/(\d+).*(Safari)/);
  if (!m) return os;
  const [name, ver] = m[2] === "Safari" ? ["Safari", m[1]] : [m[1], m[2]];
  const pretty = { Edg: "Edge", EdgiOS: "Edge", CriOS: "Chrome", FxiOS: "Firefox" }[name] ?? name;
  return `${pretty} ${ver} / ${os}`;
}

export function reportError(kind: ErrorKind, err: unknown) {
  if (process.env.NODE_ENV !== "production" || typeof window === "undefined") return;
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return;

  const e = err as { message?: string; stack?: string } | undefined;
  const message = scrub(String(e?.message ?? err ?? "unknown"), 500);
  const dedupe = `${kind}:${message}`;
  if (sent.size >= MAX_PER_PAGE || sent.has(dedupe)) return;
  sent.add(dedupe);

  const body = {
    build: (process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown").slice(0, 64),
    path: window.location.pathname.slice(0, 200),
    kind,
    message,
    stack: e?.stack ? scrub(e.stack, 2000) : null,
    browser: browserLabel(navigator.userAgent),
  };
  void fetch(`${url}/rest/v1/client_errors`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

/** Window-level listeners; call once (components/shell/offline-support.tsx). */
export function installErrorReporting(): () => void {
  const onError = (ev: ErrorEvent) => reportError("error", ev.error ?? ev.message);
  const onRejection = (ev: PromiseRejectionEvent) => reportError("unhandledrejection", ev.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
