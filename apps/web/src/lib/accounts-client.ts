// SPDX-License-Identifier: AGPL-3.0-or-later
// Accounts v2 data access (Phase 31). Everything runs in the browser under RLS.
"use client";

import { friendlyError, PRIVACY_VERSION, scansToCsv, type ExportedData } from "@/lib/accounts";
import { ensureUserId, getSupabase } from "@/lib/supabase/client";

export interface AccountData {
  handle: string | null;
  handleChangedAt: string | null;
  avatar: string | null;
  isPublic: boolean;
  displayName: string | null;
  role: string;
  institution: { id: string; name: string; joinedAt: string | null } | null;
  birthYear: number | null;
  birthYearEdits: number;
  consents: { kind: string; version: string; accepted_at: string }[];
}

type Result = { error?: string };

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error("Accounts aren't available right now.");
  return sb;
}

export async function loadAccount(userId: string): Promise<AccountData | null> {
  const sb = await client();
  const [profile, priv, consents] = await Promise.all([
    sb
      .from("profiles")
      .select(
        "handle, handle_changed_at, avatar, is_public, display_name, role, institution_id, institution_joined_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    sb.from("profile_private").select("birth_year, birth_year_edits").maybeSingle(),
    sb.from("consents").select("kind, version, accepted_at").order("accepted_at"),
  ]);
  const p = profile.data;
  if (!p) return null;
  let institution: AccountData["institution"] = null;
  if (p.institution_id) {
    const { data } = await sb
      .from("institutions")
      .select("id, name")
      .eq("id", p.institution_id)
      .maybeSingle();
    if (data) institution = { id: data.id, name: data.name, joinedAt: p.institution_joined_at };
  }
  return {
    handle: p.handle,
    handleChangedAt: p.handle_changed_at,
    avatar: p.avatar,
    isPublic: p.is_public,
    displayName: p.display_name,
    role: p.role,
    institution,
    birthYear: priv.data?.birth_year ?? null,
    birthYearEdits: priv.data?.birth_year_edits ?? 0,
    consents: consents.data ?? [],
  };
}

export async function handleAvailable(handle: string): Promise<boolean | string> {
  const sb = await client();
  const { data, error } = await sb.rpc("handle_available", {
    p_handle: handle.trim().toLowerCase(),
  });
  return error ? friendlyError(error) : Boolean(data);
}

export async function updateProfile(
  userId: string,
  patch: { handle?: string | null; avatar?: string | null; is_public?: boolean },
): Promise<Result> {
  const sb = await client();
  const { error } = await sb.from("profiles").update(patch).eq("id", userId);
  return error ? { error: friendlyError(error) } : {};
}

/** Saves the birth year (first time: insert; later: one correction). */
export async function saveBirthYear(year: number, existing: boolean): Promise<Result> {
  const sb = await client();
  const uid = await ensureUserId();
  if (!uid) return { error: "Couldn't start a session. Check your connection." };
  const { error } = existing
    ? await sb.from("profile_private").update({ birth_year: year }).eq("user_id", uid)
    : await sb.from("profile_private").insert({ birth_year: year });
  return error ? { error: friendlyError(error) } : {};
}

export async function recordConsent(kind: "privacy_notice" | "guardian_notice"): Promise<Result> {
  const sb = await client();
  const { error } = await sb.from("consents").insert({ kind, version: PRIVACY_VERSION });
  return error ? { error: friendlyError(error) } : {};
}

export async function joinInstitution(code: string): Promise<{ name?: string; error?: string }> {
  const sb = await client();
  if (!(await ensureUserId())) return { error: "Couldn't start a session. Check your connection." };
  const { data, error } = await sb.rpc("join_institution", { p_code: code });
  if (error) return { error: friendlyError(error) };
  const row = data?.[0];
  return row ? { name: row.name } : { error: "That code didn't match. Check it with your admin." };
}

export async function leaveInstitution(): Promise<Result> {
  const sb = await client();
  const { error } = await sb.rpc("leave_institution");
  return error ? { error: friendlyError(error) } : {};
}

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** RA 10173 portability: everything as JSON, scans also as CSV. */
export async function exportMyData(format: "json" | "csv"): Promise<Result> {
  const sb = await client();
  const { data, error } = await sb.rpc("export_my_data");
  if (error || !data) return { error: friendlyError(error) };
  const exported = data as unknown as ExportedData;
  const day = new Date().toISOString().slice(0, 10);
  // Preferences live on the device too; include them for completeness.
  let local: unknown = null;
  try {
    local = JSON.parse(localStorage.getItem("itapon-prefs") ?? "null");
  } catch {
    /* ignore */
  }
  if (format === "json") {
    download(
      `itapon-data-${day}.json`,
      "application/json",
      JSON.stringify({ ...exported, device_preferences: local }, null, 2),
    );
  } else {
    download(`itapon-scans-${day}.csv`, "text/csv", scansToCsv(exported));
  }
  return {};
}

/** Deletes shared photos (storage), then the account and everything linked to it. */
export async function deleteMyAccount(): Promise<Result> {
  const sb = await client();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return {};
  const bucket = sb.storage.from("training-images");
  const { data: files } = await bucket.list(uid, { limit: 1000 });
  if (files?.length) {
    const { error } = await bucket.remove(files.map((f) => `${uid}/${f.name}`));
    if (error) return { error: "Couldn't delete your shared photos. Try again." };
  }
  const { error } = await sb.rpc("delete_my_account");
  if (error) return { error: friendlyError(error) };
  await sb.auth.signOut({ scope: "local" }); // the user no longer exists
  try {
    localStorage.removeItem("itapon-prefs");
    sessionStorage.removeItem("itapon-last-scan");
  } catch {
    /* ignore */
  }
  return {};
}

/** Revokes every session of this account (all devices). */
export async function signOutEverywhere(): Promise<Result> {
  const sb = await client();
  const { error } = await sb.auth.signOut({ scope: "global" });
  return error ? { error: "Couldn't sign out everywhere. Check your connection." } : {};
}
