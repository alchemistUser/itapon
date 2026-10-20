// SPDX-License-Identifier: AGPL-3.0-or-later
"use client";

// Kiosk mode (Phase 18): a tablet or monitor above the bins. Staff tap "Start" once
// (unlocks fullscreen, sound and wake lock); after that it runs hands-free:
// scan → lock → read aloud → show the bin for 6 s → reset. Idle after 40 s with nothing in
// front of it: attract screen, detector paused, woken by camera motion.
import { KioskPairing } from "@/components/kiosk/kiosk-pairing";
import { supabaseConfigured } from "@/lib/supabase/client";
import { Hand, Maximize, Settings, Volume2, VolumeX, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BinTile } from "@/components/bins/bins";
import { KioskLibraryLine, useKioskLines, type KioskLine } from "@/components/library/kiosk-line";
import { ResultPanel, type ResultView } from "@/components/scan/scan-views";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";
import { WarmingUpOverlay } from "@/components/ui/warming-up-overlay";
import { BINS } from "@/lib/bins";
import { getItemLive, useContentSource } from "@/lib/content-store";
import { ensureDetector, retryDetector, useDetectorState } from "@/lib/detector/store";
import {
  loadKioskSettings,
  saveKioskSettings,
  sendHeartbeat,
  useKioskDevice,
  useMotionWake,
  useOnline,
  useWakeLock,
  type KioskSettings,
} from "@/lib/kiosk/hooks";
import { getPrefs } from "@/lib/prefs";
import { logScan } from "@/lib/scan/log-scan";
import { useCamera } from "@/lib/scan/use-camera";
import { useScanLoop, type ScanFrame } from "@/lib/scan/use-scan-loop";
import { partsFor, speak, stopSpeaking } from "@/lib/speech";

const RESULT_MS = 6000;
const IDLE_MS = 40_000;

function toView(classKey: string, confidence: number): ResultView | null {
  const c = getItemLive(classKey);
  return c
    ? {
        classKey,
        name: c.name,
        nameFil: c.nameFil,
        category: c.category,
        instruction: c.instruction,
        confidence,
      }
    : null;
}

export function KioskScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [settings, setSettings] = useState<KioskSettings>({ cameraId: null, sound: true });
  const [started, setStarted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [locked, setLocked] = useState<ResultView | null>(null);
  const [line, setLine] = useState<KioskLine | null>(null);
  const kioskLine = useKioskLines(); // Phase 30: "where else / idea" after the bin
  const [lockedAt, setLockedAt] = useState(0);
  const [idle, setIdle] = useState(false);
  const [now, setNow] = useState(0);
  const lastActivity = useRef(0);
  // Duplicate guard: after a result, the same item must leave the frame before it can
  // lock (and be logged) again.
  const lastKey = useRef<string | null>(null);
  const clearedSince = useRef(true);
  const scanStart = useRef(0);

  useContentSource();
  const { device, refresh: refreshDevice } = useKioskDevice();
  const online = useOnline();
  const det = useDetectorState();
  const camera = useCamera(videoRef, { deviceId: settings.cameraId });
  useWakeLock(started);

  // Phase 25: uptime heartbeat while a registered kiosk is running (one per 5-minute window).
  useEffect(() => {
    if (!started || !device) return;
    void sendHeartbeat();
    const id = window.setInterval(() => void sendHeartbeat(), 4 * 60_000);
    return () => window.clearInterval(id);
  }, [started, device]);

  // Settings live in localStorage (per kiosk); read after mount.
  useEffect(() => {
    const t = window.setTimeout(() => setSettings(loadKioskSettings()), 0);
    ensureDetector();
    return () => window.clearTimeout(t);
  }, []);

  const ready = det.status === "ready" && camera.status === "live";
  const scanning = started && ready && !locked && !idle;

  useEffect(() => {
    if (scanning) scanStart.current = performance.now();
  }, [scanning]);

  const onLock = useCallback(
    (s: { classKey: string; confidence: number }, frame: ScanFrame) => {
      if (s.classKey === lastKey.current && !clearedSince.current) return false;
      const view = toView(s.classKey, s.confidence);
      if (!view) return false;
      lastKey.current = s.classKey;
      clearedSince.current = false;
      const extra = kioskLine(s.classKey);
      setLocked(view);
      setLine(extra);
      setLockedAt(Date.now());
      lastActivity.current = Date.now();
      if (settings.sound) {
        const parts = partsFor(view, getPrefs().language);
        speak(extra ? [...parts, { text: extra.text, lang: "en" }] : parts);
      }
      void logScan({
        modelVersion: det.info?.modelVersion ?? "unknown",
        backend: det.info?.backend ?? "wasm",
        latencyMs: performance.now() - scanStart.current,
        primaryClassKey: s.classKey,
        detections: frame.detections,
      });
    },
    [settings.sound, det.info, kioskLine],
  );

  const loop = useScanLoop(videoRef, {
    enabled: scanning,
    onLock: (s, frame) => (s.status === "locked" ? onLock(s, frame) : false),
  });
  const tentative =
    loop.stability.status === "tentative"
      ? toView(loop.stability.classKey, loop.stability.confidence)
      : null;

  const next = useCallback(() => {
    stopSpeaking();
    setLocked(null);
    lastActivity.current = Date.now();
  }, []);

  // One clock drives the auto-reset countdown and the idle check. The checks run inside the
  // timer callback (not an effect), reading the latest values from refs.
  const lockedRef = useRef(locked);
  const lockedAtRef = useRef(lockedAt);
  const idleRef = useRef(idle);
  useEffect(() => {
    lockedRef.current = locked;
    lockedAtRef.current = lockedAt;
    idleRef.current = idle;
  }, [locked, lockedAt, idle]);

  useEffect(() => {
    if (!started) return;
    const t = window.setInterval(() => {
      const t0 = Date.now();
      setNow(t0);
      if (lockedRef.current && t0 - lockedAtRef.current >= RESULT_MS) next();
      else if (!lockedRef.current && !idleRef.current && t0 - lastActivity.current > IDLE_MS) {
        setIdle(true);
      }
    }, 250);
    return () => window.clearInterval(t);
  }, [started, next]);

  // Something in front of the camera counts as activity; an empty frame clears the
  // duplicate guard.
  useEffect(() => {
    if (loop.stability.status !== "searching") lastActivity.current = Date.now();
    else clearedSince.current = true;
  }, [loop.stability]);

  const wake = useCallback(() => {
    lastActivity.current = Date.now();
    setIdle(false);
  }, []);
  useMotionWake(videoRef, started && idle && camera.status === "live", wake);

  function start() {
    lastActivity.current = Date.now();
    setStarted(true);
    void document.documentElement.requestFullscreen?.().catch(() => {});
    // Prime speech while we have the tap (browsers block audio before a user gesture).
    if (settings.sound && "speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    }
  }

  function update(patch: Partial<KioskSettings>) {
    const nextSettings = { ...settings, ...patch };
    setSettings(nextSettings);
    saveKioskSettings(nextSettings);
  }

  const order = device?.binOrder;
  const progress = locked ? Math.min(1, (now - lockedAt) / RESULT_MS) : 0;

  return (
    <main className="relative grid min-h-dvh grid-rows-[minmax(320px,1fr)_auto] bg-surface landscape:grid-cols-2 landscape:grid-rows-1">
      {/* camera */}
      <div className="relative isolate overflow-hidden bg-[#0b0d12]">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          aria-label="Live camera preview"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-4 text-white">
          <span className="rounded-full bg-black/40 px-3 py-1.5 text-sm font-semibold backdrop-blur">
            iTapon{device ? ` · ${device.label}` : ""}
          </span>
          <span className="flex gap-2">
            {!online ? (
              <span className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs backdrop-blur">
                <WifiOff aria-hidden className="size-4" /> Offline: still scanning
              </span>
            ) : null}
            <button
              type="button"
              aria-label="Kiosk settings"
              onClick={() => setShowSettings(true)}
              className="flex size-11 items-center justify-center rounded-full bg-black/40 backdrop-blur hover:bg-black/55"
            >
              <Settings aria-hidden className="size-5" />
            </button>
          </span>
        </div>
        {!locked && !idle ? (
          <p className="absolute inset-x-0 bottom-[8%] z-10 px-6 text-center text-lg font-semibold text-white drop-shadow">
            {tentative
              ? `Possibly ${tentative.name.toLowerCase()}… hold still`
              : "Hold your item up to the camera"}
          </p>
        ) : null}

        {/* idle / attract */}
        {started && idle ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-ink/80 px-6 text-center text-white">
            <Hand aria-hidden className="size-16 animate-bounce" />
            <p className="text-3xl font-bold">Hold your trash up to the camera</p>
            <p className="text-lg text-white/85">iTapon will tell you which bin it goes in.</p>
          </div>
        ) : null}

        {/* model loading */}
        {started && det.status !== "ready" ? (
          <WarmingUpOverlay
            className="absolute inset-0 z-20"
            loadedMB={
              det.progress?.phase === "download" ? (det.progress.loaded ?? 0) / 1e6 : undefined
            }
            totalMB={
              det.progress?.phase === "download" ? (det.progress.total ?? 0) / 1e6 : undefined
            }
          />
        ) : null}
        {det.status === "error" ? (
          <div
            role="alert"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-ink/90 p-6 text-center text-white"
          >
            <p className="text-xl font-semibold">Scanner offline. Please use the bin labels.</p>
            <Button onClick={retryDetector}>Retry</Button>
          </div>
        ) : null}
        {camera.status !== "live" && camera.status !== "starting" ? (
          <div
            role="alert"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-ink/95 p-6 text-center text-white"
          >
            <p className="text-xl font-semibold">Camera not available</p>
            <p className="max-w-sm text-sm text-white/80">
              Check the camera cable and permission, then pick it in Kiosk settings.
            </p>
            <Button onClick={() => setShowSettings(true)}>Kiosk settings</Button>
          </div>
        ) : null}
      </div>

      {/* result side */}
      <div className="flex flex-col p-6 lg:p-10">
        <p className="sr-only" role="status" aria-live="assertive">
          {locked ? `${locked.name}. ${BINS[locked.category].binLabel}.` : ""}
        </p>
        {locked ? (
          <>
            <ResultPanel
              item={locked}
              onNext={next}
              binOrder={order}
              hidePlanLink
              library={<KioskLibraryLine line={line} />}
              className="flex-1"
            />
            <div aria-hidden className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-brand" style={{ width: `${(1 - progress) * 100}%` }} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-6">
            <Logo />
            <h1 className="text-4xl font-bold tracking-tight text-ink lg:text-5xl">
              Which bin does it go in?
            </h1>
            <p className="text-xl text-ink-2">
              Hold one item in front of the camera. iTapon shows the bin and reads it out loud.
            </p>
            <ul className="grid grid-cols-4 gap-3" aria-label="The bins here">
              {(order ?? (["biodegradable", "recyclable", "residual", "hazardous"] as const)).map(
                (k) => (
                  <li key={k} className="flex flex-col items-center gap-1.5 text-center">
                    <BinTile
                      category={k}
                      size="lg"
                      className="aspect-square size-auto w-full max-w-24"
                    />
                    <span className="text-sm font-medium text-ink-2">{BINS[k].shortName}</span>
                  </li>
                ),
              )}
            </ul>
            {!device ? (
              <p className="text-xs text-ink-3">
                Not registered as a kiosk: scans are logged without a location. Open ⚙ to pair it.
              </p>
            ) : device.locationNote ? (
              <p className="text-xs text-ink-3">{device.locationNote}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* one tap from staff: fullscreen + sound + wake lock */}
      {!started ? (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-surface/95 p-6 text-center">
          <Logo />
          <h1 className="text-3xl font-bold text-ink">Kiosk mode</h1>
          <p className="max-w-md text-ink-2">
            Tap Start once to go fullscreen and turn on sound. iTapon then runs hands-free and
            resets after every item.
          </p>
          <Button size="lg" onClick={start}>
            <Maximize aria-hidden className="size-5" /> Start kiosk
          </Button>
          <p className="text-xs text-ink-3">
            {det.status === "ready" ? "Scanner ready." : "Loading the scanner…"}{" "}
            {camera.status === "live" ? "Camera ready." : "Waiting for the camera…"}
          </p>
          {!device && supabaseConfigured ? <KioskPairing onPaired={refreshDevice} /> : null}
        </div>
      ) : null}

      {/* settings */}
      {showSettings ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kiosk-settings"
          className="absolute inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
        >
          <div className="flex w-full max-w-md flex-col gap-4 rounded-card bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 id="kiosk-settings" className="text-lg font-semibold text-ink">
                Kiosk settings
              </h2>
              <button
                type="button"
                aria-label="Close settings"
                onClick={() => setShowSettings(false)}
                className="flex size-11 items-center justify-center rounded-full hover:bg-surface"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-ink">Camera</span>
              <select
                value={settings.cameraId ?? ""}
                onChange={(e) => update({ cameraId: e.target.value || null })}
                className="h-11 rounded-control border border-line bg-white px-3"
              >
                <option value="">Default (back camera)</option>
                {camera.devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-ink">
                {settings.sound ? (
                  <Volume2 aria-hidden className="size-4" />
                ) : (
                  <VolumeX aria-hidden className="size-4" />
                )}
                Read results aloud
              </span>
              <input
                type="checkbox"
                className="size-5 accent-brand-button"
                checked={settings.sound}
                onChange={(e) => update({ sound: e.target.checked })}
              />
            </label>
            {device ? (
              <p className="text-xs text-ink-3">
                Registered as “{device.label}”. Bin order follows the device settings.
              </p>
            ) : (
              <KioskPairing onPaired={refreshDevice} />
            )}
            <Button
              variant="outline"
              onClick={() => void document.exitFullscreen?.().catch(() => {})}
            >
              Exit fullscreen
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
