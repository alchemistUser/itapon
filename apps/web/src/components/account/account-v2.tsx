// SPDX-License-Identifier: AGPL-3.0-or-later
// Account v2 sections (ROADMAP-v2 Phase 31): about you (age gate + consent), profile (handle,
// avatar, public toggle), institution (join code), and export / delete account.
"use client";

import { Building2, Download, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { AVATARS, handleCooldownDays, handleHint, isMinor, PRIVACY_VERSION } from "@/lib/accounts";
import {
  deleteMyAccount,
  exportMyData,
  handleAvailable,
  joinInstitution,
  leaveInstitution,
  loadAccount,
  recordConsent,
  saveBirthYear,
  signOutEverywhere,
  updateProfile,
  type AccountData,
} from "@/lib/accounts-client";
import { cn } from "@/lib/cn";

import { Avatar } from "./avatar";

const inputCls =
  "h-11 w-full rounded-control border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-4 focus:border-brand focus:outline-none";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

function Msg({ text, error }: { text: string | null; error?: boolean }) {
  if (!text) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn("text-sm", error ? "text-[#c4282d]" : "text-ink-2")}
    >
      {text}
    </p>
  );
}

// ---------------------------------------------------------------- about you (age gate)

function AboutYou({ data, onChange }: { data: AccountData; onChange: () => void }) {
  const consented = data.consents.some(
    (c) => c.kind === "privacy_notice" && c.version === PRIVACY_VERSION,
  );
  const guardianDone = data.consents.some((c) => c.kind === "guardian_notice");
  const [year, setYear] = useState(data.birthYear ? String(data.birthYear) : "");
  const [agree, setAgree] = useState(consented);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const minor = isMinor(data.birthYear);
  const canEditYear = data.birthYear === null || data.birthYearEdits < 1;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const y = Number(year);
    if (year && y !== data.birthYear) {
      const r = await saveBirthYear(y, data.birthYear !== null);
      if (r.error) {
        setBusy(false);
        return setMsg({ text: r.error, error: true });
      }
    }
    if (agree && !consented) {
      const r = await recordConsent("privacy_notice");
      if (r.error) {
        setBusy(false);
        return setMsg({ text: r.error, error: true });
      }
    }
    setBusy(false);
    setMsg({ text: "Saved." });
    onChange();
  }

  return (
    <Section title="About you">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Birth year</span>
          <span className="text-ink-3">
            Only to keep under-18 accounts private. Never shown to anyone, including admins.
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            placeholder="e.g. 2004"
            value={year}
            disabled={!canEditYear}
            onChange={(e) => setYear(e.target.value)}
            className={cn(inputCls, "max-w-40")}
          />
          {data.birthYear && canEditYear ? (
            <span className="text-xs text-ink-3">You can correct it once.</span>
          ) : !canEditYear ? (
            <span className="text-xs text-ink-3">
              Already corrected once. Ask the iTapon team to change it.
            </span>
          ) : null}
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-5 accent-brand-button"
            checked={agree}
            disabled={consented}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span>
            I&apos;ve read the{" "}
            <Link href="/privacy" className="text-brand-strong underline">
              privacy notice
            </Link>{" "}
            ({PRIVACY_VERSION}).
          </span>
        </label>
        <Button
          type="submit"
          className="self-start"
          disabled={busy || (!year && agree === consented)}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
        <Msg text={msg?.text ?? null} error={msg?.error} />
      </form>
      {minor ? (
        <div className="flex flex-col gap-2 rounded-tile bg-surface p-3 text-sm text-ink-2">
          <p className="flex items-start gap-2">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-strong" />
            {data.birthYear
              ? "Your account counts as under 18, so your profile stays private and you won't appear on leaderboards."
              : "Until you add a birth year, your account counts as under 18: your profile stays private."}
          </p>
          {data.birthYear ? (
            guardianDone ? (
              <p className="text-xs text-ink-3">Guardian notice acknowledged.</p>
            ) : (
              <>
                <p>
                  <strong>For your parent or guardian:</strong> iTapon stores which items were
                  scanned and when, plus the profile choices on this page. You can export or delete
                  everything here at any time. Please show them the privacy notice.
                </p>
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={async () => {
                    const r = await recordConsent("guardian_notice");
                    if (r.error) setMsg({ text: r.error, error: true });
                    else onChange();
                  }}
                >
                  My guardian has seen this
                </Button>
              </>
            )
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}

// ---------------------------------------------------------------- profile

function ProfileV2({
  userId,
  data,
  onChange,
}: {
  userId: string;
  data: AccountData;
  onChange: () => void;
}) {
  const [handle, setHandle] = useState(data.handle ?? "");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const cooldown = handleCooldownDays(data.handleChangedAt, !!data.handle);
  const minor = isMinor(data.birthYear);

  async function saveHandle(e: FormEvent) {
    e.preventDefault();
    const h = handle.trim().toLowerCase();
    if (h === (data.handle ?? "")) return;
    const hint = handleHint(h);
    if (hint) return setStatus({ text: hint, error: true });
    const free = await handleAvailable(h);
    if (free !== true)
      return setStatus({
        text: free === false ? "That handle is taken or not allowed." : free,
        error: true,
      });
    const r = await updateProfile(userId, { handle: h });
    setStatus(r.error ? { text: r.error, error: true } : { text: "Handle saved." });
    if (!r.error) onChange();
  }

  async function patch(p: Parameters<typeof updateProfile>[1]) {
    const r = await updateProfile(userId, p);
    setStatus(r.error ? { text: r.error, error: true } : { text: "Saved." });
    onChange();
  }

  return (
    <Section title="Public profile">
      <p className="text-sm text-ink-3">
        For leaderboards later. Don&apos;t use your real name or student number.
      </p>
      <form onSubmit={saveHandle} className="flex flex-col gap-1 text-sm">
        <label htmlFor="handle" className="font-medium text-ink">
          Handle
        </label>
        <div className="flex gap-2">
          <span className="relative flex-1">
            <span aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">
              @
            </span>
            <input
              id="handle"
              value={handle}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={cooldown > 0}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              aria-describedby="handle-help"
              className={cn(inputCls, "pl-7")}
            />
          </span>
          <Button
            type="submit"
            variant="outline"
            disabled={cooldown > 0 || handle === (data.handle ?? "")}
          >
            Save
          </Button>
        </div>
        <span id="handle-help" className="text-xs text-ink-3">
          {cooldown > 0
            ? `You can change it again in ${cooldown} day${cooldown === 1 ? "" : "s"}.`
            : "3–20 lowercase letters, numbers or _. You can change it once every 30 days."}
        </span>
      </form>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Avatar</legend>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              aria-label={`Avatar ${a.split("-")[0]}`}
              aria-pressed={data.avatar === a}
              onClick={() => void patch({ avatar: a })}
              className={cn(
                "rounded-full p-0.5",
                data.avatar === a
                  ? "ring-2 ring-brand-strong"
                  : "ring-1 ring-transparent hover:ring-line",
              )}
            >
              <Avatar value={a} />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>
          <span className="block font-medium text-ink">Show my handle and avatar publicly</span>
          <span className="block text-ink-3">
            {minor
              ? "Not available for accounts under 18."
              : "Off by default. Only for leaderboards."}
          </span>
        </span>
        <input
          type="checkbox"
          className="size-5 accent-brand-button"
          checked={data.isPublic}
          disabled={minor}
          onChange={(e) => void patch({ is_public: e.target.checked })}
        />
      </label>
      <Msg text={status?.text ?? null} error={status?.error} />
    </Section>
  );
}

// ---------------------------------------------------------------- institution

function InstitutionCard({ data, onChange }: { data: AccountData | null; onChange: () => void }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = data && (data.role === "admin" || data.role === "kiosk");

  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await joinInstitution(code);
    setBusy(false);
    setMsg(r.error ? { text: r.error, error: true } : { text: `You joined ${r.name}.` });
    if (!r.error) {
      setCode("");
      onChange();
    }
  }

  return (
    <Section title="School or office">
      {data?.institution ? (
        <>
          <p className="flex items-center gap-2 text-sm text-ink">
            <Building2 aria-hidden className="size-4 text-brand-strong" />
            <span>
              Member of <strong>{data.institution.name}</strong>
              {data.institution.joinedAt
                ? ` since ${new Date(data.institution.joinedAt).toLocaleDateString()}`
                : ""}
            </span>
          </p>
          <p className="text-xs text-ink-3">
            Its admins see your scans in their totals and your handle or display name, never your
            email or birth year.
          </p>
          {locked ? null : (
            <Button
              variant="outline"
              className="self-start"
              onClick={async () => {
                const r = await leaveInstitution();
                setMsg(
                  r.error ? { text: r.error, error: true } : { text: "You left the institution." },
                );
                onChange();
              }}
            >
              Leave
            </Button>
          )}
        </>
      ) : (
        <form onSubmit={join} className="flex flex-col gap-2">
          <p className="text-sm text-ink-3">
            Got a join code from your school or office? Your scans then count in its totals.
          </p>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Join code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7KQ2MXPA"
                maxLength={12}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className={cn(
                  inputCls,
                  "font-mono tracking-widest uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case",
                )}
              />
            </label>
            <Button type="submit" disabled={busy || code.replace(/[^A-Za-z0-9]/g, "").length < 8}>
              {busy ? "Joining…" : "Join"}
            </Button>
          </div>
        </form>
      )}
      <Msg text={msg?.text ?? null} error={msg?.error} />
    </Section>
  );
}

// ---------------------------------------------------------------- export & delete

function DataExtras({
  canDeleteAccount,
  signedIn,
}: {
  canDeleteAccount: boolean;
  signedIn: boolean;
}) {
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");

  async function run(fn: () => Promise<{ error?: string }>, ok: string) {
    const r = await fn();
    setMsg(r.error ? { text: r.error, error: true } : { text: ok });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => void run(() => exportMyData("json"), "Downloaded your data (JSON).")}
        >
          <Download aria-hidden className="size-4" /> Export my data (JSON)
        </Button>
        <Button
          variant="outline"
          onClick={() => void run(() => exportMyData("csv"), "Downloaded your scans (CSV).")}
        >
          <Download aria-hidden className="size-4" /> Scans as CSV
        </Button>
      </div>
      <p className="text-xs text-ink-3">
        The file is saved on this device. Don&apos;t leave it on a shared computer.
      </p>

      {signedIn ? (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => void run(signOutEverywhere, "Signed out on all devices.")}
        >
          <LogOut aria-hidden className="size-4" /> Sign out everywhere
        </Button>
      ) : null}

      {canDeleteAccount ? (
        confirm ? (
          <div className="flex flex-col gap-2 rounded-tile bg-bin-red-tint p-3 text-sm">
            <p>
              This deletes your account, scans, answers, shared photos, profile and consent records.
              It can&apos;t be undone. Type <strong>DELETE</strong> to confirm.
            </p>
            <label>
              <span className="sr-only">Type DELETE to confirm</span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className={cn(inputCls, "max-w-40")}
              />
            </label>
            <div className="flex gap-2">
              <Button
                className="bg-[#c4282d] hover:bg-[#a51f24]"
                disabled={typed !== "DELETE"}
                onClick={async () => {
                  const r = await deleteMyAccount();
                  if (r.error) setMsg({ text: r.error, error: true });
                  // A full reload on purpose: drops every in-memory client, session and cache.
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  else window.location.assign("/?account=deleted");
                }}
              >
                <Trash2 aria-hidden className="size-4" /> Delete my account
              </Button>
              <Button variant="outline" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="self-start text-[#c4282d]"
            onClick={() => setConfirm(true)}
          >
            <Trash2 aria-hidden className="size-4" /> Delete my account
          </Button>
        )
      ) : null}
      <Msg text={msg?.text ?? null} error={msg?.error} />
    </div>
  );
}

// ---------------------------------------------------------------- container

export function useAccountData(userId: string | null) {
  const [data, setData] = useState<AccountData | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void loadAccount(userId)
      .then((d) => live && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId, version]);
  return { data: userId ? data : null, reload };
}

/** The Phase 31 sections, placed by AccountView. */
export function AccountV2({
  userId,
  guest,
  slot,
}: {
  userId: string | null;
  guest: boolean;
  slot: "top" | "data";
}) {
  const { data, reload } = useAccountData(userId);
  if (slot === "data") {
    return userId ? (
      <DataExtras
        signedIn={!guest}
        canDeleteAccount={!!data && data.role !== "admin" && data.role !== "kiosk"}
      />
    ) : null;
  }
  return (
    <>
      {!guest && userId && data ? (
        <>
          <AboutYou data={data} onChange={reload} />
          <ProfileV2 userId={userId} data={data} onChange={reload} />
        </>
      ) : null}
      <InstitutionCard data={data} onChange={reload} />
    </>
  );
}
