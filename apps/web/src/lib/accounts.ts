// SPDX-License-Identifier: AGPL-3.0-or-later
// Accounts v2 (ROADMAP-v2 Phase 31; docs/accounts/privacy-review.md): handle, avatar,
// public toggle, birth year (owner-only), consent records, institution join codes, export
// and account deletion. The server enforces every rule (supabase/migrations/
// 20261021120000_accounts_v2.sql); the pure helpers below only give instant feedback.

/** Date of the privacy notice; recorded with each consent (bump it when the notice changes). */
export const PRIVACY_VERSION = "2026-10-21";

export const HANDLE_COOLDOWN_DAYS = 30;

/** Mirrors the server's format and reserved checks (the blocked-word list stays server-side). */
export function handleHint(raw: string): string | null {
  const h = raw.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(h)) return "Use 3 to 20 lowercase letters, numbers or _";
  if (["admin", "itapon", "support", "moderator", "staff", "tip", "kiosk"].includes(h))
    return "That handle is reserved";
  return null;
}

/**
 * Conservative age rule (privacy review §4): an adult only from 1 January of birth year + 19,
 * so someone turning 18 this year still counts as under 18. No birth year = under 18.
 */
export function isMinor(birthYear: number | null | undefined, now = new Date()): boolean {
  if (!birthYear) return true;
  const year = Number(
    new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Manila" }).format(now),
  );
  return year - birthYear < 19;
}

/** Days until the handle can change again (0 = now). */
export function handleCooldownDays(changedAt: string | null, hadHandle: boolean, now = new Date()) {
  if (!hadHandle || !changedAt) return 0;
  const left = new Date(changedAt).getTime() + HANDLE_COOLDOWN_DAYS * 86_400_000 - now.getTime();
  return Math.max(0, Math.ceil(left / 86_400_000));
}

/** Preset avatars (no photo uploads in v2): an icon name and a colour. */
export const AVATARS = [
  "leaf-1",
  "sprout-1",
  "tree-1",
  "flower-1",
  "sun-1",
  "cloud-1",
  "drop-1",
  "fish-1",
  "bird-1",
  "bike-1",
  "recycle-1",
  "mountain-1",
] as const;
export type AvatarKey = (typeof AVATARS)[number];

export interface ExportedData {
  exported_at: string;
  scans: {
    id: string;
    created_at: string;
    source: string;
    model_version: string;
    detections: { class_key: string; bin: string; confidence: number; is_primary: boolean }[];
  }[];
  [key: string]: unknown;
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per detection, for spreadsheets (pure; tested). */
export function scansToCsv(data: ExportedData): string {
  const rows = [
    ["scan_id", "scanned_at", "source", "model_version", "item", "bin", "confidence", "main_item"],
  ];
  for (const s of data.scans) {
    for (const d of s.detections) {
      rows.push([
        s.id,
        s.created_at,
        s.source,
        s.model_version,
        d.class_key,
        d.bin,
        String(d.confidence),
        d.is_primary ? "yes" : "no",
      ]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

/** Postgres messages raised by our functions are user-facing; others get a generic line. */
export function friendlyError(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Something went wrong. Try again.";
  if (e.code === "23505") return "That handle is taken.";
  if (e.code && ["22023", "42501", "54000"].includes(e.code) && e.message) return e.message;
  return "Couldn't save. Check your connection and try again.";
}
