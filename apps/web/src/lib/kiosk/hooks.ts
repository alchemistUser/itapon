// SPDX-License-Identifier: AGPL-3.0-or-later
// Kiosk helpers (Phase 18): the registered device, screen wake lock, motion wake-up,
// online status and local kiosk settings.
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

import type { Category } from "@/lib/detector/types";
import { ensureUserId, getSupabase } from "@/lib/supabase/client";

// ---------------------------------------------------------------- registered device

export interface KioskDevice {
  id: string;
  label: string;
  locationNote: string | null;
  binOrder: Category[];
}

const CATS = new Set<Category>(["biodegradable", "recyclable", "residual", "hazardous"]);

/**
 * The devices row linked to the signed-in kiosk account (RLS: "Kiosk reads own device").
 * null = this browser isn't a registered kiosk; scans are still logged, just not tagged.
 */
export function useKioskDevice(): {
  device: KioskDevice | null;
  loading: boolean;
  refresh: () => void;
} {
  const [state, setState] = useState<{ device: KioskDevice | null; loading: boolean }>({
    device: null,
    loading: true,
  });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sb = await getSupabase();
      const uid = sb ? (await sb.auth.getSession()).data.session?.user.id : undefined;
      if (!sb || !uid) return !cancelled && setState({ device: null, loading: false });
      const { data } = await sb
        .from("devices")
        .select("id, label, location_note, bin_order")
        .eq("kiosk_user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      const order = (data?.bin_order ?? []).filter((c): c is Category => CATS.has(c as Category));
      setState({
        loading: false,
        device: data
          ? {
              id: data.id,
              label: data.label,
              locationNote: data.location_note,
              binOrder:
                order.length === 4
                  ? order
                  : ["biodegradable", "recyclable", "residual", "hazardous"],
            }
          : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, refresh };
}

// ---------------------------------------------------------------- pairing + heartbeat (Phase 25)

/** A 6-digit code an admin enters on /admin to register this browser as a kiosk. */
export async function requestPairingCode(): Promise<
  { code: string; expiresAt: number } | { error: string }
> {
  const uid = await ensureUserId(); // anonymous session if needed: no email involved
  const sb = await getSupabase();
  if (!sb || !uid) return { error: "Can't reach the server. Check the internet connection." };
  const { data, error } = await sb.rpc("kiosk_request_pairing");
  const row = data?.[0];
  if (error || !row) return { error: error?.message ?? "Couldn't get a code." };
  return { code: row.code, expiresAt: Date.parse(row.expires_at) };
}

/** Marks the current 5-minute window as "kiosk running" (for uptime on /admin). */
export async function sendHeartbeat(): Promise<void> {
  const sb = await getSupabase();
  await sb?.rpc("kiosk_heartbeat").then(
    () => undefined,
    () => undefined,
  );
}

// ---------------------------------------------------------------- wake lock

type WakeLockNav = Navigator & {
  wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> };
};

/** Keep the screen on while `active` (re-acquired when the tab becomes visible again). */
export function useWakeLock(active: boolean): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const nav = navigator as WakeLockNav;
    if (!active || !nav.wakeLock) return;
    let lock: { release(): Promise<void> } | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await nav.wakeLock!.request("screen");
        if (!cancelled) setHeld(true);
      } catch {
        if (!cancelled) setHeld(false);
      }
    };
    const onVisible = () => document.visibilityState === "visible" && void acquire();
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
      setHeld(false);
    };
  }, [active]);
  return held;
}

// ---------------------------------------------------------------- motion wake-up

/**
 * While `watching`, compares tiny (32×24) grayscale snapshots of the video twice a second
 * and calls onMotion when the picture changes. Far cheaper than running the detector,
 * so an idle kiosk doesn't keep the CPU busy.
 */
export function useMotionWake(
  videoRef: RefObject<HTMLVideoElement | null>,
  watching: boolean,
  onMotion: () => void,
  threshold = 12,
) {
  const cb = useRef(onMotion);
  useEffect(() => {
    cb.current = onMotion;
  }, [onMotion]);

  useEffect(() => {
    if (!watching) return;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 24;
    const g = canvas.getContext("2d", { willReadFrequently: true });
    let prev: Uint8ClampedArray | null = null;
    const t = window.setInterval(() => {
      const v = videoRef.current;
      if (!g || !v || v.readyState < 2) return;
      g.drawImage(v, 0, 0, 32, 24);
      const px = g.getImageData(0, 0, 32, 24).data;
      if (prev) {
        let diff = 0;
        for (let i = 0; i < px.length; i += 4) {
          diff +=
            Math.abs(px[i] + px[i + 1] + px[i + 2] - (prev[i] + prev[i + 1] + prev[i + 2])) / 3;
        }
        if (diff / (px.length / 4) > threshold) cb.current();
      }
      prev = px;
    }, 500);
    return () => window.clearInterval(t);
  }, [watching, videoRef, threshold]);
}

// ---------------------------------------------------------------- online status

function subscribeOnline(l: () => void) {
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => {
    window.removeEventListener("online", l);
    window.removeEventListener("offline", l);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

// ---------------------------------------------------------------- local settings

export interface KioskSettings {
  cameraId: string | null;
  sound: boolean;
}

const SETTINGS_SLOT = "itapon-kiosk";
const DEFAULTS: KioskSettings = { cameraId: null, sound: true };

export function loadKioskSettings(): KioskSettings {
  try {
    return {
      ...DEFAULTS,
      ...(JSON.parse(localStorage.getItem(SETTINGS_SLOT) ?? "{}") as Partial<KioskSettings>),
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveKioskSettings(s: KioskSettings) {
  try {
    localStorage.setItem(SETTINGS_SLOT, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}
